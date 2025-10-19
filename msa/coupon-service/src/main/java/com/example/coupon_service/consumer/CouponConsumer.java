package com.example.coupon_service.consumer;

import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class CouponConsumer {

    /**
     * @RabbitListener 어노테이션을 붙이면,
     * 스프링이 알아서 "user.coupon.queue" 우체통을 계속 감시(Subscribe)합니다.
     * 메시지가 도착하면, 이 메서드가 자동으로 실행됩니다.
     */
    @RabbitListener(queues = "user.coupon.queue")
    public void receiveUserCreationMessage(String userId) {
        log.info("========================================");
        log.info("신규 회원 가입 메시지 수신 (from user.coupon.queue)");
        log.info("수신된 User ID: {}", userId);

        // (실제 로직)
        // 1. DB에서 userId로 사용자 정보를 조회 (API 호출 또는 메시지에 정보 포함)
        // 2. 해당 사용자에게 쿠폰을 생성하고 DB에 저장
        log.info("User ID: {} 님을 위한 신규 가입 쿠폰 발급 완료!", userId);
        log.info("========================================");
    }
}
