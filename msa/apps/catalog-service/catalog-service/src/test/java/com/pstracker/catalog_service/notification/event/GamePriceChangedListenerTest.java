package com.pstracker.catalog_service.notification.event;

import com.pstracker.catalog_service.catalog.domain.Wishlist;
import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.notification.domain.FcmToken;
import com.pstracker.catalog_service.notification.repository.FcmTokenRepository;
import com.pstracker.catalog_service.notification.repository.NotificationRepository;
import com.pstracker.catalog_service.notification.service.FcmService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
public class GamePriceChangedListenerTest {

    @InjectMocks
    private GamePriceChangedListener listener;

    @Mock
    private WishlistRepository wishlistRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private FcmTokenRepository fcmTokenRepository;

    @Mock
    private FcmService fcmService;

    @Test
    @DisplayName("찜한 유저가 없으면 알림 로직이 조기 종료되어야 한다.")
    void handle_NoSubscribers() {
        GamePriceChangedEvent event = createEvent();

        given(wishlistRepository.findAllByGameIdWithMember(event.getGameId()))
                .willReturn(Collections.emptyList());

        listener.handlePriceChange(event);

        // 1. DB 저장이 호출되지 않아야 함
        verify(notificationRepository, never()).saveAll(anyList());
        // 2. 토큰 조회도 하지 않아야 함
        verify(fcmTokenRepository, never()).findAllByMemberIdIn(anyList());
    }

    @Test
    @DisplayName("FCM 토큰이 없는 유저라도 DB 알림(In-App)은 저장되어야 한다.")
    void handle_Subscribers_NoToken() {
        GamePriceChangedEvent event = createEvent();
        Member member = createMember(1L);
        Wishlist wishlist = createWishlist(member, 50000);

        given(wishlistRepository.findAllByGameIdWithMember(event.getGameId()))
                .willReturn(List.of(wishlist));

        given(fcmTokenRepository.findAllByMemberIdIn(List.of(1L)))
                .willReturn(Collections.emptyList());

        listener.handlePriceChange(event);

        // 1. DB 알림은 저장되어야 함
        verify(notificationRepository, times(1)).saveAll(anyList());
        // 2. FCM 다중 발송은 시도하지 않아야 함
        verify(fcmService, never()).sendMulticastMessage(anyList(), any(), any());
    }

    @Test
    @DisplayName("가격 하락 알림을 끈 유저에게는 DB 알림만 저장되고 FCM은 발송되지 않아야 한다.")
    void handle_PriceAlertDisabled() {
        GamePriceChangedEvent event = createEvent();
        Member member = mock(Member.class);

        given(member.isPriceAlertEnabled()).willReturn(false); // 알림 수신 거부 상태!

        Wishlist wishlist = createWishlist(member, 50000);

        given(wishlistRepository.findAllByGameIdWithMember(event.getGameId()))
                .willReturn(List.of(wishlist));

        listener.handlePriceChange(event);

        // 1. 알림을 껐더라도 인앱 DB 알림은 저장되어야 함
        verify(notificationRepository, times(1)).saveAll(anyList());
        // 2. 알림을 껐기 때문에 토큰 조회나 푸시 발송 로직은 타지 않아야 함
        verify(fcmTokenRepository, never()).findAllByMemberIdIn(anyList());
        verify(fcmService, never()).sendMulticastMessage(anyList(), any(), any());
    }

    @Test
    @DisplayName("구독자와 토큰이 모두 존재하면 DB 저장 및 FCM 발송이 개별 수행되어야 한다.")
    void handle_FullFlow() {
        // given
        GamePriceChangedEvent event = createEvent();

        Member member1 = createMember(1L);
        Member member2 = createMember(2L);

        Wishlist wish1 = createWishlist(member1, 50000); // 타겟가 5만 원
        Wishlist wish2 = createWishlist(member2, 30000); // 타겟가 3만 원

        given(wishlistRepository.findAllByGameIdWithMember(event.getGameId()))
                .willReturn(List.of(wish1, wish2));

        FcmToken token1 = createToken(member1, "token_1");
        FcmToken token2 = createToken(member2, "token_2");

        // 개별 발송이므로 각각 토큰을 조회함
        given(fcmTokenRepository.findAllByMemberIdIn(List.of(1L))).willReturn(List.of(token1));
        given(fcmTokenRepository.findAllByMemberIdIn(List.of(2L))).willReturn(List.of(token2));

        // when
        listener.handlePriceChange(event);

        // then
        // 1. DB 알림 일괄 저장 확인
        verify(notificationRepository, times(1)).saveAll(argThat(items ->
                ((java.util.Collection<?>) items).size() == 2
        ));

        // 2. FCM 다중 발송이 개별적으로 2번 호출되어야 함!
        verify(fcmService, times(2)).sendMulticastMessage(anyList(), anyString(), anyString());
    }

    @Test
    @DisplayName("FCM 발송 중 에러가 발생해도 DB 알림 저장은 롤백되지 않고 로직이 완료되어야 한다.")
    void handle_FcmError_ShouldNotRollback() {
        // given
        GamePriceChangedEvent event = createEvent();
        Member member = createMember(1L);
        Wishlist wishlist = createWishlist(member, 50000);
        FcmToken token = createToken(member, "token_error");

        given(wishlistRepository.findAllByGameIdWithMember(event.getGameId()))
                .willReturn(List.of(wishlist));
        given(fcmTokenRepository.findAllByMemberIdIn(List.of(1L)))
                .willReturn(List.of(token));

        doThrow(new RuntimeException("FCM Connection Timeout"))
                .when(fcmService).sendMulticastMessage(anyList(), any(), any());

        // when
        listener.handlePriceChange(event);

        // then
        // 1. 에러가 났지만 DB 저장은 이미 수행되었어야 함
        verify(notificationRepository, times(1)).saveAll(anyList());

        // 2. FCM 다중 발송 시도는 했어야 함
        verify(fcmService, times(1)).sendMulticastMessage(anyList(), any(), any());
    }

    // --- Helpers ---
    private GamePriceChangedEvent createEvent() {
        return new GamePriceChangedEvent(100L, "Elden Ring", "PROD-001", 60000, 30000, 50, "img.jpg");
    }

    private Member createMember(Long id) {
        Member member = mock(Member.class);
        lenient().when(member.getId()).thenReturn(id);
        lenient().when(member.isPriceAlertEnabled()).thenReturn(true);
        return member;
    }

    private Wishlist createWishlist(Member member, Integer targetPrice) {
        Wishlist wishlist = mock(Wishlist.class);
        lenient().when(wishlist.getMember()).thenReturn(member);
        lenient().when(wishlist.getTargetPrice()).thenReturn(targetPrice);
        return wishlist;
    }

    private FcmToken createToken(Member member, String tokenValue) {
        FcmToken token = mock(FcmToken.class);
        lenient().when(token.getToken()).thenReturn(tokenValue);
        return token;
    }
}