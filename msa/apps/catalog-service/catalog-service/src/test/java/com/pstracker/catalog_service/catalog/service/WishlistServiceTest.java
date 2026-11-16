package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.Wishlist;
import com.pstracker.catalog_service.catalog.dto.WishlistStatusResponse;
import com.pstracker.catalog_service.catalog.repository.GameGenreRepository;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.global.exception.BusinessException;
import com.pstracker.catalog_service.global.exception.ErrorCode;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WishlistServiceTest {

    @InjectMocks
    private WishlistService wishlistService;

    @Mock
    private WishlistRepository wishlistRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameGenreRepository gameGenreRepository;

    @Mock
    private GamePriceHistoryRepository priceHistoryRepository;

    @Mock
    private MemberRepository memberRepository;

    private Game createGame(int originalPrice) {
        Game game = Game.create(
                "PPSA-001", "Test Game", "Test Game",
                "Pub", "https://img", "desc", LocalDate.of(2025, 1, 1));
        game.updatePriceSearchInfo(originalPrice, originalPrice, 0, false, null, false);
        return game;
    }

    @Test
    @DisplayName("신규 찜 등록(PUT): targetPrice 없이 등록하면 liked=true, targetPrice=null 을 반환한다")
    void upsertWishlist_newWithoutTargetPrice() {
        Game game = createGame(60000);
        Member memberRef = mock(Member.class);
        given(gameRepository.findById(10L)).willReturn(Optional.of(game));
        given(wishlistRepository.findByMemberIdAndGameId(1L, 10L)).willReturn(Optional.empty());
        given(wishlistRepository.countByMemberId(1L)).willReturn(0L);
        given(memberRepository.getReferenceById(1L)).willReturn(memberRef);

        WishlistStatusResponse response = wishlistService.upsertWishlist(1L, 10L, null);

        assertThat(response.liked()).isTrue();
        assertThat(response.targetPrice()).isNull();
        assertThat(response.message()).isEqualTo("찜 목록에 추가되었습니다.");
        verify(wishlistRepository).save(any(Wishlist.class));
    }

    @Test
    @DisplayName("중복 PUT(멱등성): 이미 목표가가 있는 찜에 targetPrice=null 로 다시 PUT 해도 기존 목표가가 유지된다")
    void upsertWishlist_duplicateWithoutTargetPrice_preservesExistingTargetPrice() {
        Game game = createGame(60000);
        Member member = mock(Member.class);
        Wishlist existing = Wishlist.createWithTargetPrice(member, game, 25000);

        given(gameRepository.findById(10L)).willReturn(Optional.of(game));
        given(wishlistRepository.findByMemberIdAndGameId(1L, 10L)).willReturn(Optional.of(existing));

        WishlistStatusResponse response = wishlistService.upsertWishlist(1L, 10L, null);

        assertThat(response.liked()).isTrue();
        assertThat(response.targetPrice()).isEqualTo(25000);
        verify(wishlistRepository, never()).save(any());
        verify(wishlistRepository, never()).delete(any());
    }

    @Test
    @DisplayName("기존 찜 목표가 설정(PUT): targetPrice가 전달되면 목표가를 갱신하고 liked=true를 반환한다")
    void upsertWishlist_existingWithTargetPrice_updatesTargetPrice() {
        Game game = createGame(60000);
        Member member = mock(Member.class);
        Wishlist existing = Wishlist.createWithTargetPrice(member, game, null);

        given(gameRepository.findById(10L)).willReturn(Optional.of(game));
        given(wishlistRepository.findByMemberIdAndGameId(1L, 10L)).willReturn(Optional.of(existing));

        WishlistStatusResponse response = wishlistService.upsertWishlist(1L, 10L, 30000);

        assertThat(response.liked()).isTrue();
        assertThat(response.targetPrice()).isEqualTo(30000);
        assertThat(existing.getTargetPrice()).isEqualTo(30000);
        assertThat(response.message()).isEqualTo("목표가가 설정되었습니다.");
    }

    @Test
    @DisplayName("목표가가 0 이하이거나 정가 이상이면 IllegalArgumentException 이 발생한다")
    void upsertWishlist_invalidTargetPrice_throwsIllegalArgument() {
        Game game = createGame(60000);
        given(gameRepository.findById(10L)).willReturn(Optional.of(game));

        assertThatThrownBy(() -> wishlistService.upsertWishlist(1L, 10L, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> wishlistService.upsertWishlist(1L, 10L, 60000))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("위시리스트 최대 30개 한도를 초과하면 IllegalStateException 이 발생한다")
    void upsertWishlist_exceedsLimit_throwsIllegalState() {
        Game game = createGame(60000);
        given(gameRepository.findById(10L)).willReturn(Optional.of(game));
        given(wishlistRepository.findByMemberIdAndGameId(1L, 10L)).willReturn(Optional.empty());
        given(wishlistRepository.countByMemberId(1L)).willReturn(30L);

        assertThatThrownBy(() -> wishlistService.upsertWishlist(1L, 10L, null))
                .isInstanceOf(IllegalStateException.class);
        verify(wishlistRepository, never()).save(any());
    }

    @Test
    @DisplayName("찜 해제(DELETE): 기존 찜이 있으면 삭제 후 liked=false를 반환한다")
    void removeWishlist_existing_deletesAndReturnsFalse() {
        Game game = createGame(60000);
        Wishlist existing = Wishlist.createWithTargetPrice(mock(Member.class), game, 25000);

        given(gameRepository.existsById(10L)).willReturn(true);
        given(wishlistRepository.findByMemberIdAndGameId(1L, 10L)).willReturn(Optional.of(existing));

        WishlistStatusResponse response = wishlistService.removeWishlist(1L, 10L);

        assertThat(response.liked()).isFalse();
        assertThat(response.targetPrice()).isNull();
        verify(wishlistRepository).delete(existing);
    }

    @Test
    @DisplayName("찜 해제(멱등성): 이미 해제된 게임에 다시 DELETE 해도 예외 없이 liked=false를 반환한다")
    void removeWishlist_alreadyAbsent_isIdempotent() {
        given(gameRepository.existsById(10L)).willReturn(true);
        given(wishlistRepository.findByMemberIdAndGameId(1L, 10L)).willReturn(Optional.empty());

        WishlistStatusResponse response = wishlistService.removeWishlist(1L, 10L);

        assertThat(response.liked()).isFalse();
        assertThat(response.targetPrice()).isNull();
        verify(wishlistRepository, never()).delete(any());
    }

    @Test
    @DisplayName("존재하지 않는 게임에 찜 등록/해제를 요청하면 BusinessException(GAME_NOT_FOUND) 이 발생한다")
    void wishlist_missingGame_throwsGameNotFound() {
        given(gameRepository.findById(999L)).willReturn(Optional.empty());
        given(gameRepository.existsById(999L)).willReturn(false);

        assertThatThrownBy(() -> wishlistService.upsertWishlist(1L, 999L, null))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.GAME_NOT_FOUND);

        assertThatThrownBy(() -> wishlistService.removeWishlist(1L, 999L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.GAME_NOT_FOUND);
    }
}
