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

    // --- [Scenario 1: 구독자가 없는 경우] ---
    @Test
    @DisplayName("찜한 유저가 없으면 알림 로직이 조기 종료되어야 한다.")
    void handle_NoSubscribers() {
        // given
        GamePriceChangedEvent event = createEvent();
        // 구독자 없음
        given(wishlistRepository.findMembersByGamePsStoreId(event.getPsStoreId()))
                .willReturn(Collections.emptyList());

        // when
        listener.handlePriceChange(event);

        // then
        // 1. DB 저장이 호출되지 않아야 함
        verify(notificationRepository, never()).saveAll(anyList());
        // 2. 토큰 조회도 하지 않아야 함
        verify(fcmTokenRepository, never()).findAllByMemberIdIn(anyList());
    }

    // --- [Scenario 2: 구독자는 있지만 FCM 토큰이 없는 경우] ---
    @Test
    @DisplayName("FCM 토큰이 없는 유저라도 DB 알림(In-App)은 저장되어야 한다.")
    void handle_Subscribers_NoToken() {
        // given
        GamePriceChangedEvent event = createEvent();
        Member member = createMember(1L);

        // 구독자 1명 발견
        given(wishlistRepository.findMembersByGamePsStoreId(event.getPsStoreId()))
                .willReturn(List.of(member));
        // 하지만 토큰은 없음
        given(fcmTokenRepository.findAllByMemberIdIn(List.of(1L)))
                .willReturn(Collections.emptyList());

        // when
        listener.handlePriceChange(event);

        // then
        // 1. DB 알림은 저장되어야 함 (In-App 알림)
        verify(notificationRepository, times(1)).saveAll(anyList());
        // 2. FCM 발송은 시도하지 않아야 함
        verify(fcmService, never()).sendMessage(any(), any(), any());
    }

    // --- [Scenario 3: 정상 발송 (Happy Path)] ---
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
        // 1. DB 알림 저장 확인 (2명분)
        verify(notificationRepository, times(1)).saveAll(argThat(items ->
                ((java.util.Collection<?>) items).size() == 2
        ));

        // 2. FCM 발송 확인 (각 토큰별로 1번씩 총 2번 호출)
        verify(fcmService, times(1)).sendMessage(eq("token_1"), any(), any());
        verify(fcmService, times(1)).sendMessage(eq("token_2"), any(), any());
    }

    // --- [Scenario 4: FCM 발송 실패 (Exception Handling)] ---
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

        // 🚨 FCM 발송 시 예외 발생 설정!
        doThrow(new RuntimeException("FCM Connection Timeout"))
                .when(fcmService).sendMessage(eq("token_error"), any(), any());

        // when
        // 예외가 발생해도 메서드 밖으로 던져지지 않아야 함 (try-catch 검증)
        listener.handlePriceChange(event);

        // then
        // 1. 에러가 났지만 DB 저장은 이미 수행되었어야 함
        verify(notificationRepository, times(1)).saveAll(anyList());

        // 2. FCM 발송 시도는 했어야 함
        verify(fcmService, times(1)).sendMessage(eq("token_error"), any(), any());
    }

    // --- Helpers ---
    private GamePriceChangedEvent createEvent() {
        return new GamePriceChangedEvent(100L, "Elden Ring", "PROD-001", 60000, 30000, 50, "img.jpg");
    }

    private Member createMember(Long id) {
        // Member는 엔티티라 생성자가 복잡할 수 있으니, Mock을 쓰거나 Reflection을 써야 할 수도 있음.
        // 여기서는 Mock으로 간단하게 ID만 반환하도록 처리
        Member member = mock(Member.class);
        given(member.getId()).willReturn(id);
        return member;
    }

    private FcmToken createToken(Member member, String tokenValue) {
        // FcmToken도 엔티티라면 생성자 패턴에 맞게 수정 필요
        // 여기서는 Mock 사용
        FcmToken token = mock(FcmToken.class);
        given(token.getToken()).willReturn(tokenValue);
        return token;
    }
}
