# MSA Level 2: 설정 완전 자동화 (Spring Cloud Bus & Webhook)

## 📝 학습 목표

- 중앙 설정 변경 시, 각 서비스를 재기동하거나 수동으로 갱신해야 하는 문제점을 이해함.
- **Spring Cloud Bus**의 개념을 학습하여, 단 한 번의 명령으로 모든 서비스의 설정을 동적으로 갱신하는 방법을 익힘.
- 메시지 브로커로 **RabbitMQ**를 선택한 이유를 이해하고, Docker를 통해 직접 구축 및 연동함.
- **GitHub Webhook**과 **ngrok**을 사용하여, Git Push만으로 모든 설정 갱신 과정을 완전 자동화함.

## 📚 학습 목차

1.  **[Spring Cloud Bus: MSA의 순환 버스](#1-spring-cloud-bus-msa의-순환-버스)**
2.  **[왜 RabbitMQ인가?: Kafka와의 비교](#2-왜-rabbitmq인가-kafka와의-비교)**
3.  **[반자동화: 수동 새로고침](#3-반자동화-수동-새로고침)**
4.  **[완전 자동화: GitHub Webhook](#4-완전-자동화-github-webhook)**

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

### 3. 반자동화: 수동 새로고침

- **구현**:
    1.  **RabbitMQ 설치**: `docker-compose`를 사용하여 RabbitMQ Management 이미지를 실행.
    2.  **의존성 추가**: 모든 서비스(`config`, `gateway`, `user`)의 `build.gradle`에 `spring-cloud-starter-bus-amqp`와 `spring-boot-starter-actuator` 추가.
    3.  **설정 연결**: 모든 서비스가 RabbitMQ에 접속할 수 있도록 `backend-lab-config`의 공통 `application.yml`에 `spring.rabbitmq` 설정 추가.
    4.  **새로고침 대상 지정**: 설정 변경이 필요한 컴포넌트(`UserController`)에 `@RefreshScope` 어노테이션 추가.
- **테스트**: 아무 서비스의 `/actuator/busrefresh` 엔드포인트로 `POST` 요청을 보내, 재기동 없이 설정이 갱신됨을 확인.

### 4. 완전 자동화: GitHub Webhook 🔔

- **문제점**: `/actuator/busrefresh`를 수동으로 호출해야 하는 마지막 불편함이 남음.
- **개념**: **Webhook**은 특정 이벤트(예: `git push`)가 발생했을 때, 한 시스템이 다른 시스템에 미리 약속된 URL로 HTTP 요청을 보내 자동으로 알려주는 '푸시 알림'.
- **구현**:
    1.  **`ngrok` 사용**: 외부 인터넷(GitHub)에서 로컬 서버(`localhost`)에 접근할 수 있도록 임시 공개 주소를 생성하는 '터널링' 도구.
    2.  **`config-service` 의존성 추가**: `spring-cloud-config-monitor` 의존성을 추가하여, GitHub 웹훅을 수신하는 전용 `/monitor` 엔드포인트를 활성화.
    3.  **GitHub Webhook 설정**: `backend-lab-config` 저장소의 [Settings] -> [Webhooks]에서, `ngrok`으로 생성한 URL + `/monitor`를 Payload URL로 등록.
- **최종 결과**: `backend-lab-config` 저장소에 **`git push`**만 하면, **[GitHub Webhook] → [`ngrok`] → [`config-service:/monitor`] → [RabbitMQ] → [모든 서비스 자동 새로고침]**의 완전 자동화 파이프라인이 동작.

---