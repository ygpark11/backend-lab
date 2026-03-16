package com.pstracker.catalog_service.notification.event;

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

        given(wishlistRepository.findMembersByGamePsStoreId(event.getPsStoreId()))
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

        given(wishlistRepository.findMembersByGamePsStoreId(event.getPsStoreId()))
                .willReturn(List.of(member));

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

        given(wishlistRepository.findMembersByGamePsStoreId(event.getPsStoreId()))
                .willReturn(List.of(member));

        listener.handlePriceChange(event);

        // 1. 알림을 껐더라도 인앱 DB 알림은 저장되어야 함
        verify(notificationRepository, times(1)).saveAll(anyList());
        // 2. 알림을 껐기 때문에 토큰 조회나 푸시 발송 로직은 타지 않아야 함
        verify(fcmTokenRepository, never()).findAllByMemberIdIn(anyList());
        verify(fcmService, never()).sendMulticastMessage(anyList(), any(), any());
    }

    @Test
    @DisplayName("구독자와 토큰이 모두 존재하면 DB 저장 및 FCM 발송이 수행되어야 한다.")
    void handle_FullFlow() {
        // given
        GamePriceChangedEvent event = createEvent();
        Member member1 = createMember(1L);
        Member member2 = createMember(2L);

        // 구독자 2명
        given(wishlistRepository.findMembersByGamePsStoreId(event.getPsStoreId()))
                .willReturn(List.of(member1, member2));

        // 토큰도 2개
        FcmToken token1 = createToken(member1, "token_1");
        FcmToken token2 = createToken(member2, "token_2");
        given(fcmTokenRepository.findAllByMemberIdIn(List.of(1L, 2L)))
                .willReturn(List.of(token1, token2));

        // when
        listener.handlePriceChange(event);

        // then
        // 1. DB 알림 저장 확인
        verify(notificationRepository, times(1)).saveAll(argThat(items ->
                ((java.util.Collection<?>) items).size() == 2
        ));

        // 2. FCM 다중 발송 확인
        verify(fcmService, times(1)).sendMulticastMessage(anyList(), any(), any());
    }

    @Test
    @DisplayName("FCM 발송 중 에러가 발생해도 DB 알림 저장은 롤백되지 않고 로직이 완료되어야 한다.")
    void handle_FcmError_ShouldNotRollback() {
        // given
        GamePriceChangedEvent event = createEvent();
        Member member = createMember(1L);
        FcmToken token = createToken(member, "token_error");

        given(wishlistRepository.findMembersByGamePsStoreId(event.getPsStoreId()))
                .willReturn(List.of(member));
        given(fcmTokenRepository.findAllByMemberIdIn(List.of(1L)))
                .willReturn(List.of(token));

        doThrow(new RuntimeException("FCM Connection Timeout"))
                .when(fcmService).sendMulticastMessage(anyList(), any(), any());

        // when
        // 예외가 발생해도 메서드 밖으로 던져지지 않아야 함 (try-catch 검증)
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
        given(member.getId()).willReturn(id);

        lenient().when(member.isPriceAlertEnabled()).thenReturn(true);

        return member;
    }

    private FcmToken createToken(Member member, String tokenValue) {
        FcmToken token = mock(FcmToken.class);
        lenient().when(token.getToken()).thenReturn(tokenValue);
        return token;
    }
}