package com.pstracker.catalog_service.catalog.listener;

import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DiscordNotificationListener {

    @Value("${discord.webhook.url}")
    private String webhookUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * @Async:
     * 이 메서드는 별도의 스레드에서 실행됩니다.
     * 알림 전송이 1초가 걸리든 3초가 걸리든, 핵심 로직(DB 저장)에는 영향을 주지 않습니다.
     */
    @Async
    @EventListener
    public void handlePriceChange(GamePriceChangedEvent event) {
        try {
            log.info("🔔 Sending Discord Notification for: {}", event.getGameName());

            // 1. 메시지 본문 구성 (Discord 포맷)
            String content = String.format(
                    "## 🚨 가격 하락 감지! 🚨\n" +
                            "**%s**\n" +
                            "📉 **%d%% 할인** (%d원 -> **%d원**)\n" +
                            "👉 [구매하러 가기](https://store.playstation.com/ko-kr/product/%s)",
                    event.getGameName(),
                    event.getDiscountRate(),
                    event.getOldPrice(),
                    event.getNewPrice(),
                    event.getPsStoreId()
            );

            // 2. JSON Payload 생성
            Map<String, Object> payload = new HashMap<>();
            payload.put("content", content);
            // payload.put("username", "PS-Watcher"); // 봇 이름을 바꾸고 싶다면 추가

            // 3. 전송
            restTemplate.postForEntity(webhookUrl, payload, String.class);
            log.info("✅ Notification sent successfully.");

        } catch (Exception e) {
            log.error("❌ Failed to send Discord notification", e);
        }
    }
}
