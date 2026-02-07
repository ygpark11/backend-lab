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
                    return true;
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

        return wishlistPage.map(WishlistResponse::new);
    }
}
