package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.Wishlist;
import com.pstracker.catalog_service.catalog.dto.GameGenreResult;
import com.pstracker.catalog_service.catalog.dto.WishlistResponse;
import com.pstracker.catalog_service.catalog.repository.GameGenreRepository;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.global.util.PriceVerdictCalculator;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WishlistService {

    private static final int MAX_WISHLIST_LIMIT = 30;

    private final WishlistRepository wishlistRepository;
    private final GameRepository gameRepository;
    private final GameGenreRepository gameGenreRepository;
    private final GamePriceHistoryRepository priceHistoryRepository;
    private final MemberRepository memberRepository; // Proxy 조회용

    /**
     * 찜하기 토글 (Toggle)
     * - 이미 있으면 -> 삭제 (return false)
     * - 없으면 -> 저장 (return true)
     */
    @Transactional
    public String toggleWishlist(Long memberId, Long gameId, Integer targetPrice) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("해당 게임을 찾을 수 없습니다."));

        if (targetPrice != null && targetPrice <= 0) {
            throw new IllegalArgumentException("목표가는 0원보다 커야 합니다.");
        }

        if (targetPrice != null && targetPrice >= game.getOriginalPrice()) {
            throw new IllegalArgumentException("목표가는 정가(" + game.getOriginalPrice() + "원)보다 낮아야 합니다.");
        }

        Optional<Wishlist> existingWishlist = wishlistRepository.findByMemberIdAndGameId(memberId, gameId);

        if (existingWishlist.isPresent()) {
            Wishlist wishlist = existingWishlist.get();

            // 1. 이미 찜한 상태인데 새로운 목표가를 보냈다 -> '수정'
            if (targetPrice != null) {
                wishlist.updateTargetPrice(targetPrice);
                return "목표가가 설정되었습니다.";
            } else {
                // 2. 목표가 없이 다시 하트를 눌렀다 -> 기존 찜 '취소'
                wishlistRepository.delete(wishlist);
                return "찜 목록에서 삭제되었습니다.";
            }
        } else {
            // 3. 새로 찜하는 경우 -> '추가'
            if (wishlistRepository.countByMemberId(memberId) >= MAX_WISHLIST_LIMIT) {
                throw new IllegalStateException("위시리스트는 최대 " + MAX_WISHLIST_LIMIT + "개까지만 등록 가능합니다.");
            }

            Member memberRef = memberRepository.getReferenceById(memberId);

            Wishlist newWishlist = Wishlist.createWithTargetPrice(memberRef, game, targetPrice);
            wishlistRepository.save(newWishlist);

            return "찜 목록에 추가되었습니다.";
        }
    }

    /**
     * 내 찜 목록 조회
     * @param memberId 멤버 ID
     * @param pageable 페이징 정보
     * @return 찜 목록 페이지
     */
    public Page<WishlistResponse> getMyWishlist(Long memberId, Pageable pageable) {
        Pageable safe = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 50), pageable.getSort());
        Page<WishlistResponse> result = wishlistRepository.findAllByMemberId(memberId, safe);

        if (!result.isEmpty()) {
            markGameGenre(result.getContent());
        }

        return result;
    }

    /**
     * 찜 목록에 장르 정보 및 가격 판정 매핑
     * - 게임 ID 리스트로 한 번에 조회하여 N+1 문제 방지
     */
    private void markGameGenre(List<WishlistResponse> wishlist) {
        List<Long> gameIds = wishlist.stream().map(WishlistResponse::getGameId).toList();

        List<GameGenreResult> gameGenres = gameGenreRepository.findGameGenres(gameIds);
        Map<Long, List<String>> gameGenreMap = gameGenres.stream()
                .collect(Collectors.groupingBy(
                        GameGenreResult::getGameId, Collectors.mapping(GameGenreResult::getGenreName, Collectors.toList())));
        wishlist.forEach(dto -> dto.setGenres(gameGenreMap.getOrDefault(dto.getGameId(), List.of())));

        Map<Long, Integer> historyCountMap = priceHistoryRepository.countGroupByGameId(gameIds)
                .stream()
                .collect(Collectors.toMap(
                        arr -> (Long) arr[0],
                        arr -> ((Long) arr[1]).intValue()
                ));
        wishlist.forEach(dto -> {
            int historySize = historyCountMap.getOrDefault(dto.getGameId(), 0);
            PriceVerdict verdict = PriceVerdictCalculator.forGame(
                    dto.getCurrentPrice(), dto.getOriginalPrice(), dto.getLowestPrice(), historySize);
            dto.setPriceVerdict(verdict.name());
        });
    }
}
