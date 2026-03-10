package com.pstracker.catalog_service.notice.event;

import com.pstracker.catalog_service.notification.domain.FcmToken;
import com.pstracker.catalog_service.notification.repository.FcmTokenRepository;
import com.pstracker.catalog_service.notification.service.FcmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NoticeEventListener {

    private final FcmTokenRepository fcmTokenRepository;
    private final FcmService fcmService;

    @Async
    @EventListener
    public void handleNoticeCreated(NoticeCreatedEvent event) {
        log.debug("공지사항 등록 이벤트 수신! 전체 유저에게 푸시를 발송합니다.");

        List<FcmToken> allTokens = fcmTokenRepository.findAll();

        if (allTokens.isEmpty()) {
            log.debug("📭 발송할 FCM 토큰이 없습니다.");
            return;
        }

        String pushTitle = "[공지] " + event.getTitle();
        String pushBody = "공지가 등록되었습니다. 자세한 내용은 공지사항에서 확인해주세요.";

        fcmService.sendMulticastMessage(allTokens, pushTitle, pushBody);
    }
}
