# Level 1: API Gateway, 서비스 디스커버리 & 중앙 설정 관리

## 📝 학습 목표

- MSA의 핵심 관문(Entrypoint)인 **API Gateway**의 역할을 이해하고, **Spring Cloud Gateway**를 사용하여 직접 구축함.
- 서비스들의 주소를 동적으로 관리하는 **서비스 디스커버리(Service Discovery)** 패턴을 이해하고, **Eureka Server**를 통해 구현함.
- 흩어져 있는 설정 파일들을 **중앙에서 통합 관리**하는 **Config Server**를 구축하고, Git을 통해 설정을 형상 관리함.

## 📚 학습 목차

1.  **[API Gateway: MSA의 중앙 안내 데스크](#1-api-gateway-msa의-중앙-안내-데스크)**
2.  **[서비스 디스커버리: 똑똑한 길 찾기](#2-서비스-디스커버리-똑똑한-길-찾기)**
3.   **[중앙 설정 관리: Config Server](#3-중앙-설정-관리-config-server)**

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

---

### 3. 중앙 설정 관리: Config Server 📢

- **문제점**: 각 서비스가 자신만의 `application.yml`을 가지면, 서비스가 수십 개로 늘어났을 때 설정 변경 및 관리가 매우 어려워짐.
- **개념**: 모든 서비스의 설정 파일을 **Git 저장소** 한 곳에 모아두고, **Config Server**가 이 Git 저장소를 읽어 각 서비스에게 필요한 설정을 '방송'해주는 중앙 집중형 관리 방식.
- **장점**:
    - **중앙화**: 모든 설정이 한 곳에 있어 관리가 용이함.
    - **형상 관리**: Git을 통해 모든 설정 변경 이력을 추적할 수 있음.
    - **동적 갱신**: (Actuator와 같은 도구를 통해) 애플리케이션 재시작 없이 설정 변경을 반영할 수 있음.

#### 아키텍처 구성 (Config Server 추가)

| 서비스 이름 | 포트 | 역할 | 비유 |
| :--- | :--- | :--- | :--- |
| **`discovery-service`**| `8761` | Eureka Server | 📞 **중앙 전화번호부** |
| **`config-service`** | `8888` | Config Server | 📢 **중앙 방송실** |
| **`gateway-service`** | `8000` | API Gateway | 💁‍♂️ **중앙 안내 데스크** |
| **`user-service`** | `8081` | Microservice | 🏬 **사용자 전문 매장** |

#### 핵심 코드: `config-service/application.yml`
```yaml
server:
  port: 8888 # Config Server의 표준 포트

spring:
  application:
    name: config-service
  cloud:
    config:
      server:
        git:
          # (1) '방송 원고'가 저장된 Git 저장소 주소
          uri: [https://github.com/ygpark11/backend-lab-config.git](https://github.com/ygpark11/backend-lab-config.git) 
          
# (2) Config Server 자신은 유레카에 등록하지 않도록 로컬 설정으로 덮어쓰기
eureka:
  client:
    enabled: false
```

#### 핵심 코드: `backend-lab-config` Git 저장소의 파일 구조
- `application.yml`: (공통 설정): 모든 서비스가 공유하는 설정 (예: 유레카 주소)
```yaml
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
```

- `user-service.yml`: (개별 설정): `user-service`에만 적용되는 설정 (예: 포트 번호)
```yaml
server:
  port: 8081
```

- `gateway-service.yml`: (개별 설정): `gateway-service`에만 적용되는 설정 (예: 포트 번호)
```yaml
server:
  port: 8000

spring:
  cloud:
    gateway:
      server:
        webflux:
          routes:
            - id: user-service-route # 규칙 이름
              uri: lb://user-service # eureka 서버에 등록된 user-service에 주소로 찾아가도록 동적 설정
              predicates:
                - Path=/users/** # /users/로 시작하는 모든 요청을 잡도록 변경
```

#### 핵심 코드: `user-service/application.yml`  (Config Client 설정)
- 기존 `bootstrap.yml` 방식이 아닌, 최신 스프링 부트 방식(`spring.config.import`) 사용.
```yaml
spring:
  application:
    name: user-service # (1) 내가 누구인지 알려주어, Config Server에서 'user-service.yml'을 찾게 함
  config:
    # (2) '중앙 방송실'의 주소를 알려줌
    import: "configserver:http://localhost:8888"
```

#### 핵심 코드: `gateway-service/application.yml`  (Config Client 설정)
- 기존 `bootstrap.yml` 방식이 아닌, 최신 스프링 부트 방식(`spring.config.import`) 사용.
```yaml
spring:
  application:
    name: gateway-service # (1) 내가 누구인지 알려주어, Config Server에서 'gateway-service.yml'을 찾게 함
  config:
    # (2) '중앙 방송실'의 주소를 알려줌
    import: "configserver:http://localhost:8888"
```

---
## 💻 최종 결과

- 4개의 독립적인 스프링 부트 애플리케이션(`discovery`, `config`, `gateway`, `user`)을 실행.
- `gateway`와 `user` 서비스는 시작 시 `config-service`에 먼저 접속하여 자신의 설정을 받아옴.
- 그 설정에 포함된 유레카 주소를 보고 `discovery-service`에 자신을 등록함.
- 모든 과정이 완료된 후, 클라이언트는 Gateway를 통해 User 서비스에 정상적으로 요청을 보낼 수 있음.