# Level 2: 설정 자동 새로고침 (Spring Cloud Bus & RabbitMQ)

## 📝 학습 목표

- 중앙 설정 변경 시, 각 서비스를 재기동해야 하는 문제점을 이해함.
- **Spring Cloud Bus**의 개념을 학습하여, 단 한 번의 명령으로 모든 서비스의 설정을 동적으로 갱신하는 방법을 익힘.
- Spring Cloud Bus의 메시지 브로커로 **RabbitMQ**를 선택한 이유를 이해하고, Docker를 통해 직접 구축 및 연동함.
- **`@RefreshScope`**와 **Actuator**의 `bus-refresh` 엔드포인트를 사용하여 실제 설정 변경을 테스트함.

## 📚 학습 목차

1.  **[Spring Cloud Bus: MSA의 순환 버스](#1-spring-cloud-bus-msa의-순환-버스)**
2.  **[왜 RabbitMQ인가?: Kafka와의 비교](#2-왜-rabbitmq인가-kafka와의-비교)**
3.  **[구현: 자동 방송 시스템 구축](#3-구현-자동-방송-시스템-구축)**

---

## 🚀 핵심 학습 내용

### 1. Spring Cloud Bus: MSA의 순환 버스 🚌

- **문제점**: `Config Server`를 사용해도, Git의 설정 변경 내용은 각 서비스가 시작될 때 한 번만 가져감. 변경 사항을 적용하려면 모든 서비스를 수동으로 재시작하거나, 각 서비스의 `/actuator/refresh` 엔드포인트를 일일이 호출해야 함.
- **개념**: 모든 마이크로서비스를 연결하는 보이지 않는 '순환 버스'. 한 서비스에 전달된 '새로고침' 명령을 버스에 타고 있는 모든 서비스에게 전파(Broadcast)하는 역할을 함.
- **동작 원리**: 메시지 브로커(RabbitMQ, Kafka)를 통해 이벤트(설정 변경)를 모든 서비스에 전달.

### 2. 왜 RabbitMQ인가?: Kafka와의 비교

- `Spring Cloud Bus`의 임무는 "설정이 바뀌었으니 새로고침 해!" 라는 **가볍고 일시적인 '알림'**을 전달하는 것. 이 목적을 위해서는 대용량 데이터 보관이 목적인 'CCTV(카프카)'보다, 신속한 메시지 전달이 목적인 '긴급 방송 시스템(RabbitMQ)'이 더 적합하고 효율적임.

| 구분 | **카프카 (Kafka)** | **RabbitMQ** |
| :--- | :--- | :--- |
| **비유** | 📹 CCTV 녹화 시스템 | 🔊 긴급 방송 시스템 |
| **핵심 목적** | 이벤트 **'기록' 및 '보관'** | 메시지 **'신속' 및 '안전' 전달** |
| **적합한 용도**| - 대용량 데이터 파이프라인<br>- 이벤트 소싱 | - 가벼운 알림, RPC<br>- **`Spring Cloud Bus`** |

- **결론**: 이미 카프카를 운영 중이라 인프라를 통일하고 싶다면 카프카를 쓸 수도 있지만, 아키텍처의 명확성과 역할 분리를 위해 `Spring Cloud Bus` 용도로는 RabbitMQ를 사용하는 것이 더 일반적이고 효율적인 설계임.

### 3. 구현: 자동 방송 시스템 구축

- **1단계 (RabbitMQ 설치)**: `docker-compose`를 사용하여 RabbitMQ Management 이미지를 실행.
- **2단계 (의존성 추가)**: 모든 서비스(`config`, `gateway`, `user`)의 `build.gradle`에 `spring-cloud-starter-bus-amqp`와 `spring-boot-starter-actuator` 추가.
- **3단계 (설정 연결)**: 모든 서비스가 RabbitMQ에 접속할 수 있도록 `backend-lab-config`의 공통 `application.yml`에 `spring.rabbitmq` 설정 추가.
- **4단계 (새로고침 대상 지정)**: 설정 변경이 필요한 컴포넌트(`UserController`)에 `@RefreshScope` 어노테이션 추가.
- **5단계 (엔드포인트 노출)**: 각 클라이언트 서비스의 `application.yml`에 `management.endpoints.web.exposure.include: bus-refresh` 설정 추가.

---

## 💻 최종 테스트

1.  `backend-lab-config` Git 저장소의 `user-service.yml`에 테스트용 메시지(`test.message`) 수정 후 `push`.
2.  아무 서비스(예: `user-service`)의 `/actuator/busrefresh` 엔드포인트로 `POST` 요청 전송.
    - **주의**: 최신 버전에서는 하이픈 없는 `busrefresh` 사용.
    ```bash
    curl -X POST http://localhost:8081/actuator/busrefresh
    ```
3.  `user-service`의 `/users/message` API를 다시 호출하여, **서비스 재기동 없이** 메시지가 변경되었음을 확인.