package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.domain.Wishlist;
import com.pstracker.catalog_service.catalog.dto.WishlistResponse;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final GameRepository gameRepository;
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
                    return false; // 삭제됨 (찜 해제)
                })
                .orElseGet(() -> {
                    // 프록시 객체 활용 (DB Select 최소화)
                    Member memberRef = memberRepository.getReferenceById(memberId);
                    Game gameRef = gameRepository.getReferenceById(gameId);

                    wishlistRepository.save(Wishlist.create(memberRef, gameRef));
                    return true; // 저장됨 (찜 추가)
                });
    }

    /**
     * 내 찜 목록 조회
     * @param memberId 멤버 ID
     * @param pageable 페이징 정보
     * @return 찜 목록 페이지
     */
    public Page<WishlistResponse> getMyWishlist(Long memberId, Pageable pageable) {
        Page<Wishlist> wishlistPage = wishlistRepository.findAllByMemberId(memberId, pageable);

        return wishlistPage.map(wishlist -> {
            // 게임의 가격 이력 중 가장 최신 것 1개를 조회
            // (데이터가 많지 않다면 스트림으로 처리해도 무방
            //  대용량일 경우엔 QueryDSL 단계에서 처리해야 하지만, 게임별 가격변동은 100건 미만이므로 우선 스트림으로 처리)
            GamePriceHistory latestPrice = wishlist.getGame().getPriceHistories().stream()
                    .max(Comparator.comparing(GamePriceHistory::getRecordedAt))
                    .orElse(null);

            return new WishlistResponse(wishlist, latestPrice);
        });
    }
}
