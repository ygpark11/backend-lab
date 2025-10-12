# Level 1: API Gateway와 서비스 디스커버리 구축

🗓️ **날짜**: 2025년 10월 12일

## 📝 학습 목표

- 모놀리식 아키텍처의 한계를 이해하고, 마이크로서비스 아키텍처(MSA)의 기본 개념과 장단점을 학습함.
- MSA의 핵심 관문(Entrypoint)인 **API Gateway**의 역할을 이해하고, **Spring Cloud Gateway**를 사용하여 직접 구축함.
- 서비스들의 주소를 동적으로 관리하는 **서비스 디스커버리(Service Discovery)** 패턴을 이해하고, **Eureka Server**를 통해 구현함.

## 📚 학습 목차

1.  **[API Gateway: MSA의 중앙 안내 데스크](#1-api-gateway-msa의-중앙-안내-데스크)**
2.  **[서비스 디스커버리: 똑똑한 길 찾기](#2-서비스-디스커버리-똑똑한-길-찾기)**

---

## 🚀 핵심 학습 내용

### 1. API Gateway: MSA의 중앙 안내 데스크

- **개념**: 모든 외부 요청을 가장 먼저 받아, 요청에 맞는 내부 마이크로서비스로 길을 안내해주는 '중앙 출입구'.
- **역할**: 요청 라우팅, 통합 인증/인가, 로드 밸런싱 등 MSA의 복잡성을 외부로부터 숨기는 역할을 함.
- **구현**: **Spring Cloud Gateway** (WebFlux 기반의 논블로킹 게이트웨이)
    - 전통적인 Spring MVC 기반의 **Zuul**도 있었으나, 현재는 Spring Cloud Gateway가 표준임.
    - Gateway가 WebFlux 기반이라고 해서, 연결되는 다른 서비스들까지 WebFlux일 필요는 없음. (HTTP 통신)

#### 핵심 코드: `gateway-service/application.yml`
```yaml
server:
  port: 8000 # (1) 게이트웨이는 8000번 포트에서 실행

spring:
  application:
    name: gateway-service # (2) 유레카에 등록될 서비스 이름

  cloud:
    gateway:
      server:
        webflux: # (3) 최신 버전에 맞는 설정 경로
          routes:
            - id: user-service-route # (4) 이 라우팅 규칙의 고유 ID
              
              # [초기 단계] 하드코딩 방식: 주소를 직접 지정
              # uri: http://localhost:8081 
              
              # [최종 단계] 서비스 디스커버리 방식: 유레카에 등록된 서비스 이름으로 동적 조회
              uri: lb://user-service 
              
              predicates:
                # (5) "/users/"로 시작하는 모든 요청을 이 규칙에 따라 처리
                - Path=/users/** ```
```

---

### 2. 서비스 디스커버리: 똑똑한 길 찾기

- **문제점**: 각 서비스의 주소(`localhost:8081`)를 Gateway에 하드코딩하면, 주소가 바뀌거나 서비스가 확장될 때마다 Gateway 설정을 수동으로 변경해야 함.
- **개념**: 모든 서비스가 자신의 위치를 등록하고 공유하는 '중앙 전화번호부'. Gateway는 이 전화번호부를 보고 서비스의 주소를 동적으로 찾아감.
- **구현**: **Eureka Server**

#### 아키텍처 구성

| 서비스 이름 | 포트 | 역할 | 비유 |
| :--- | :--- | :--- | :--- |
| **`discovery-service`** | `8761` | Eureka Server | 📞 **중앙 전화번호부** |
| **`gateway-service`** | `8000` | API Gateway | 💁‍♂️ **중앙 안내 데스크** |
| **`user-service`** | `8081` | Microservice | 🏬 **사용자 전문 매장** |



#### 핵심 코드: `discovery-service/application.yml`
```yaml
server:
  port: 8761 # 유레카 서버의 표준 포트

eureka:
  client:
    # (1) 나는 전화번호부 그 자체이므로, 나 자신을 등록할 필요 없음
    register-with-eureka: false 
    # (2) 나는 전화번호부이므로, 다른 곳에서 목록을 가져올 필요 없음
    fetch-registry: false
```

#### 핵심 코드: `user-service/application.yml`
```yaml
server:
  port: 8081

spring:
  application:
    name: user-service # (1) 전화번호부에 등록될 이름

eureka:
  client:
    service-url:
      # (2) 전화번호부의 위치를 알려줌
      defaultZone: http://localhost:8761/eureka/
```
---
## 💻 최종 결과

- 3개의 독립적인 스프링 부트 애플리케이션(`discovery`, `gateway`, `user`)을 실행.
- Gateway와 User 서비스가 Eureka 서버에 자동으로 등록됨.
- 클라이언트는 Gateway(`localhost:8000`)에만 요청을 보내면, Gateway가 Eureka를 통해 User 서비스의 실제 주소를 찾아 요청을 동적으로 전달함.