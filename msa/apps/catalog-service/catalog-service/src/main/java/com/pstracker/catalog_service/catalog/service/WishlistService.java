package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.Wishlist;
import com.pstracker.catalog_service.catalog.dto.GameGenreResult;
import com.pstracker.catalog_service.catalog.dto.WishlistResponse;
import com.pstracker.catalog_service.catalog.dto.WishlistStatusResponse;
import com.pstracker.catalog_service.catalog.repository.GameGenreRepository;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.global.exception.BusinessException;
import com.pstracker.catalog_service.global.exception.ErrorCode;
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
     * 찜 등록 또는 목표가 설정/수정 (멱등한 upsert 동작).
     */
    @Transactional
    public WishlistStatusResponse upsertWishlist(Long memberId, Long gameId, Integer targetPrice) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GAME_NOT_FOUND));

        if (targetPrice != null && targetPrice <= 0) {
            throw new IllegalArgumentException("목표가는 0원보다 커야 합니다.");
        }

        if (targetPrice != null && targetPrice >= game.getOriginalPrice()) {
            throw new IllegalArgumentException("목표가는 정가(" + game.getOriginalPrice() + "원)보다 낮아야 합니다.");
        }

        Optional<Wishlist> existingWishlist = wishlistRepository.findByMemberIdAndGameId(memberId, gameId);

        if (existingWishlist.isPresent()) {
            Wishlist wishlist = existingWishlist.get();
            if (targetPrice != null) {
                wishlist.updateTargetPrice(targetPrice);
                return WishlistStatusResponse.saved(targetPrice, "목표가가 설정되었습니다.");
            }
            // targetPrice가 없으면 기존 목표가를 유지한 채 멱등하게 성공 응답
            return WishlistStatusResponse.saved(wishlist.getTargetPrice(), "찜 목록에 추가되었습니다.");
        }

        if (wishlistRepository.countByMemberId(memberId) >= MAX_WISHLIST_LIMIT) {
            throw new IllegalStateException("위시리스트는 최대 " + MAX_WISHLIST_LIMIT + "개까지만 등록 가능합니다.");
        }

        Member memberRef = memberRepository.getReferenceById(memberId);
        Wishlist newWishlist = Wishlist.createWithTargetPrice(memberRef, game, targetPrice);
        wishlistRepository.save(newWishlist);

        String message = (targetPrice != null) ? "목표가가 설정되었습니다." : "찜 목록에 추가되었습니다.";
        return WishlistStatusResponse.saved(newWishlist.getTargetPrice(), message);
    }

    /**
     * 찜 해제 (이미 해제된 경우에도 멱등하게 성공 응답).
     */
    @Transactional
    public WishlistStatusResponse removeWishlist(Long memberId, Long gameId) {
        if (!gameRepository.existsById(gameId)) {
            throw new BusinessException(ErrorCode.GAME_NOT_FOUND);
        }

        wishlistRepository.findByMemberIdAndGameId(memberId, gameId)
                .ifPresent(wishlistRepository::delete);

        return WishlistStatusResponse.removed("찜 목록에서 삭제되었습니다.");
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

        if (result.isEmpty()) {
            return result;
        }
        return enrichWishlist(result);
    }

    /**
     * 찜 목록에 장르 정보 및 가격 판정 매핑
     * - 게임 ID 리스트로 한 번에 조회하여 N+1 문제 방지
     */
    private Page<WishlistResponse> enrichWishlist(Page<WishlistResponse> page) {
        List<Long> gameIds = page.getContent().stream().map(WishlistResponse::gameId).toList();

        List<GameGenreResult> gameGenres = gameGenreRepository.findGameGenres(gameIds);
        Map<Long, List<String>> gameGenreMap = gameGenres.stream()
                .collect(Collectors.groupingBy(
                        GameGenreResult::gameId, Collectors.mapping(GameGenreResult::genreName, Collectors.toList())));

        Map<Long, Integer> historyCountMap = priceHistoryRepository.countMapByGameIds(gameIds);

        return page.map(dto -> {
            int historySize = historyCountMap.getOrDefault(dto.gameId(), 0);
            PriceVerdict verdict = PriceVerdictCalculator.forGame(
                    dto.currentPrice(), dto.originalPrice(), dto.lowestPrice(), historySize);
            return dto.withEnriched(
                    gameGenreMap.getOrDefault(dto.gameId(), List.of()),
                    verdict.name()
            );
        });
    }
}
