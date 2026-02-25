package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.Wishlist;
import com.pstracker.catalog_service.catalog.dto.GameGenreResultDto;
import com.pstracker.catalog_service.catalog.dto.WishlistDto;
import com.pstracker.catalog_service.catalog.repository.GameGenreRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WishlistService {

    private static final int MAX_WISHLIST_LIMIT = 50;

    private final WishlistRepository wishlistRepository;
    private final GameRepository gameRepository;
    private final GameGenreRepository gameGenreRepository;
    private final MemberRepository memberRepository; // Proxy 조회용

    /**
     * 찜하기 토글 (Toggle)
     * - 이미 있으면 -> 삭제 (return false)
     * - 없으면 -> 저장 (return true)
     */
    @Transactional
    public boolean toggleWishlist(Long memberId, Long gameId) {
        return wishlistRepository.findByMemberIdAndGameId(memberId, gameId)
                .map(wishlist -> {
                    wishlistRepository.delete(wishlist);
                    return false;
                })
                .orElseGet(() -> {
                    long currentCount = wishlistRepository.countByMemberId(memberId);

                    if (currentCount >= MAX_WISHLIST_LIMIT) {
                        throw new IllegalStateException("찜 목록은 최대 " + MAX_WISHLIST_LIMIT + "개까지만 저장할 수 있습니다.");
                    }

                    // 프록시 객체 활용 (DB Select 최소화)
                    Member memberRef = memberRepository.getReferenceById(memberId);
                    Game gameRef = gameRepository.getReferenceById(gameId);

                    wishlistRepository.save(Wishlist.create(memberRef, gameRef));
                    return true;
                });
    }

    /**
     * 내 찜 목록 조회
     * @param memberId 멤버 ID
     * @param pageable 페이징 정보
     * @return 찜 목록 페이지
     */
    public Page<WishlistDto> getMyWishlist(Long memberId, Pageable pageable) {
        Page<WishlistDto> result = wishlistRepository.findAllByMemberId(memberId, pageable);

        if (memberId != null && !result.isEmpty()) {
            markGameGenre(result.getContent());
        }

        return result;
    }

    /**
     * 게임 검색 결과에 장르 정보 매핑
     * - 게임 ID 리스트로 한 번에 조회하여 N+1 문제 방지
     */
    private void markGameGenre(List<WishlistDto> games) {
        List<Long> gameIds = games.stream().map(WishlistDto::getGameId).toList();

        List<GameGenreResultDto> gameGenres = gameGenreRepository.findGameGenres(gameIds);

        Map<Long, List<String>> gameGenreMap = gameGenres.stream()
                .collect(Collectors.groupingBy(
                        GameGenreResultDto::getGameId, Collectors.mapping(GameGenreResultDto::getGenreName, Collectors.toList())));

        games.forEach(dto -> {
            dto.setGenres(gameGenreMap.getOrDefault(dto.getId(), List.of()));
        });
    }
}
