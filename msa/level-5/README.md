# Level 5 - 비동기 통신과 메시지 큐 (RabbitMQ)

## 학습 목표
MSA 환경에서 서비스 간의 강한 결합(Strong Coupling) 문제를 해결하기 위해, 메시지 큐(MQ)를 이용한 **비동기(Asynchronous) 통신** 방식을 이해하고 구현한다. RabbitMQ를 사용하여 '발신자(Producer)'와 '수신자(Consumer)'를 완벽하게 분리하는 **'느슨한 결합(Loose Coupling)'** 아키텍처를 완성한다.

---

## 1. 시나리오: '회원가입'과 '쿠폰 발급'의 분리

**문제 상황 (동기 통신):**
`user-service`에서 회원가입이 발생했을 때, `coupon-service`의 API를 직접 호출(HTTP)하여 쿠폰 발급을 요청하면, `coupon-service`가 느리거나 장애가 발생했을 때 회원가입 프로세스 전체가 지연되거나 실패한다.

**해결 전략 (비동기 통신):**
1.  `user-service`는 회원가입 성공 후, "신규 회원 발생"이라는 **메시지**를 RabbitMQ('우체통')에 넣고 **즉시** 사용자에게 "가입 완료" 응답을 보낸다.
2.  `coupon-service`는 `user-service`의 존재를 전혀 모른 채, 그저 '우체통'을 감시하고 있다가 메시지가 오면 이를 꺼내어 쿠폰 발급 작업을 **'나중에'** 처리한다.



---

## 2. Part 1: '발신자(Producer)' 구현 (`user-service`)

`user-service`가 메시지를 RabbitMQ로 발송하는 역할을 수행한다.

1.  **의존성 추가:** `spring-boot-starter-amqp`
2.  **설정:** `application.yml`에 RabbitMQ 접속 정보 추가
3.  **핵심 로직:** `RabbitTemplate`을 주입받아, 특정 Exchange를 향해 메시지를 발송한다.

```java
// user-service의 RabbitTemplate 발송 코드
rabbitTemplate.convertAndSend(
    "user.exchange",   // Exchange (이름표/발행자)
    "user.created",    // Routing Key (주소)
    message            // Message (내용물)
);
```

---

## 3. Part 2: '수신자(Consumer)' 구현 (`coupon-service`)

`user-service`와는 완전히 분리된 새로운 마이크로서비스(`coupon-service`)를 생성하여, 메시지를 수신하고 처리하는 역할을 수행한다.

1.  **프로젝트 생성:** `Eureka Client`, `Config Client`, `RabbitMQ` 의존성을 포함하여 신규 서비스 생성.
2.  **핵심 로직:** `@RabbitListener` 어노테이션을 사용하여 특정 큐(Queue)를 구독(listen)한다.

```java
// coupon-service의 @RabbitListener 수신 코드
@Component
public class CouponConsumer {

    @RabbitListener(queues = "user.coupon.queue")
    public void receiveUserCreationMessage(String userId) {
        log.info("신규 회원 가입 메시지 수신!");
        log.info("User ID: {} 님을 위한 쿠폰 발급 완료!", userId);
    }
}
```

## 4. 아키텍처 리팩토링 (진정한 '느슨한 결합')

초기 실습에서는 '발신자'인 `user-service`가 테스트 편의성을 위해 '수신자'의 `Queue`와 `Binding`까지 정의했다. 하지만 이는 아키텍처 원칙에 위배된다.

- `user-service` (발신자): 오직 `Exchange`의 존재만 알도록 `RabbitMQConfig`를 수정. `Queue`와 `Binding` 정의를 완전히 삭제했다. 발신자는 이제 메시지가 어디로 가는지 전혀 알 필요가 없다.
- `coupon-service` (수신자): `Exchange`, `Queue`, `Binding`을 모두 정의한다. "이 `Exchange`로 들어오는 이런 `Routing Key`의 메시지를, 내 `Queue`로 가져오겠다"고 선언하는 것은 오직 '수신자'의 책임이다.

이 리팩토링을 통해, 두 서비스는 이제 Exchange라는 추상적인 '이름표'만을 공유할 뿐, 서로의 존재를 전혀 알지 못하는 완벽한 '느슨한 결합' 아키텍처를 완성