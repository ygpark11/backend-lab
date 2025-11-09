# 📜 백엔드 마스터 클래스: Level 14-A (README)

## Level 14-A: 최종 목적지 (Deployment & Containerization) - Part 1

### 1. 학습 목표

* 우리의 MSA 함대(Config, Eureka, Gateway, User, Order) 5척과 핵심 인프라(RabbitMQ, Zipkin) 2척, **총 7개의 서비스**를 '컨테이너화'한다.
* '멀티 스테이지 빌드'를 적용한 **표준 `Dockerfile`**을 작성하여, '빌드'와 '실행' 환경을 분리하고 경량화된 '밀키트'(이미지)를 만든다.
* '편대 지휘서'인 **`docker-compose.yml`**을 작성하여, 7개 함대 전체의 '의존성'과 '네트워킹', '헬스 체크'를 완벽하게 제어한다.
* `docker-compose up --build` 단 하나의 명령으로, 'localhost' 환경에서 '실제 운영'과 유사한 MSA 풀스택을 배포하고 성공적으로 구동시킨다.

---

## 2. '표준 해결책': 최종 `Dockerfile` (5개 MSA 서비스 공통)

'빌드'와 '실행'을 분리하고, '헬스 체크'에 필요한 `curl`을 설치하며, '빌드 시점의 테스트'를 건너뛰는 '표준 해결책'이 모두 적용된 최종본입니다.

```dockerfile
# --- [Level 14-A: 최종 Dockerfile (MSA 서비스 공통)] ---

# --- 1단계: 빌드 환경 ('전문 주방') ---
# JDK와 Gradle이 포함된 무거운 빌드용 이미지 (AS build -> 'build'라는 별명)
FROM gradle:jdk17-focal AS build
WORKDIR /home/gradle/src

# 소스코드 전체 복사
COPY . .

# gradlew 실행 권한 부여
RUN chmod +x ./gradlew

# (★ Gotcha 1 ★) '빌드' vs '런타임' 문제 해결
# 'build' 작업은 하되, 'config-service' 같은 '런타임' 의존성이 필요한 'test' 작업은
# '-x test' 옵션으로 제외합니다. (빌드 시점에는 Config 서버가 떠있지 않기 때문)
RUN ./gradlew build -x test --no-daemon

# --- 2단계: 실행 환경 ('밀키트') ---
# JRE만 포함된 가볍고 효율적인 배포용 이미지 (eclipse-temurin:17-jre-jammy)
FROM eclipse-temurin:17-jre-jammy

# (★ Gotcha 2 ★) 'Healthcheck'의 'curl' 문제 해결
# 'docker-compose.yml'의 헬스체크가 사용할 'curl' 도구가 JRE 이미지에는 기본 포함되어 있지 않습니다.
# 'jammy'(Debian) 기반이므로 'apt-get'을 사용해 수동으로 설치합니다.
USER root # 루트 권한 획득
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# 작업 디렉터리 설정
WORKDIR /app

# (★핵심★)
# '1단계(build)' 주방에서 완성된 '요리'(JAR 파일)만 쏙 빼서
# '2단계(밀키트)'의 /app/app.jar 로 복사합니다.
COPY --from=build /home/gradle/src/build/libs/*.jar app.jar

# 컨테이너 실행 명령어
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

---

## 3. '표준 해결책': 최종 `docker-compose.yml` (함대 지휘서)

모든 '의존성', '헬스 체크', '네트워킹' 문제가 해결된 '진짜 최종 완성본' 편대 지휘서

```yaml
# --- [Level 14-A: '진짜 최종' docker-compose.yml (v3)] ---

version: "3.8"

services:
  # --- 0. 인프라 (Infra) ---
  # 인프라는 다른 서비스에 의존하지 않으므로 가장 먼저 정의합니다.
  rabbitmq:
    image: rabbitmq:3-management
    container_name: rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    networks:
      - msa-network
    healthcheck:
      # RabbitMQ의 표준 헬스 체크 (내장 진단 도구 사용)
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s

  zipkin:
    image: openzipkin/zipkin:latest
    container_name: zipkin
    ports:
      - "9411:9411"
    networks:
      - msa-network
    # (★ Gotcha 3 ★) 'Zipkin 헬스체크' 문제 해결
    # openzipkin/zipkin:latest 이미지에는 'curl'이 없습니다.
    # 따라서 'curl'을 사용하는 헬스체크 블록을 '완전 삭제'합니다.
    # 이렇게 하면 Docker가 이 이미지에 '내장된(built-in)' 헬스체크를 사용합니다.

  # --- 1. Config 서버 ---
  config-service:
    build: ./config-service
    container_name: config-service
    ports:
      - "8888:8888"
    networks:
      - msa-network
    depends_on:
      # Config는 인프라가 'healthy' 상태가 될 때까지 기다려야 합니다.
      rabbitmq:
        condition: service_healthy
      zipkin:
        # Zipkin도 '내장 헬스체크'를 기다리도록 'healthy' 조건을 명시합니다.
        condition: service_healthy
    healthcheck:
      # 우리의 'Dockerfile'에는 'curl'을 설치했으므로, 이 헬스체크는 정상 동작합니다.
      test: ["CMD", "curl", "-f", "http://localhost:8888/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s # Actuator가 뜨는 시간을 넉넉히 줍니다.

  # --- 2. Eureka 서버 (제자님 이름: discovery-service) ---
  discovery-service:
    build: ./discovery-service
    container_name: discovery-service
    ports:
      - "8761:8761"
    networks:
      - msa-network
    depends_on:
      # (★핵심★) '연쇄 의존성'
      # Eureka는 Config가 'healthy' 상태가 되는 것만 기다리면 됩니다.
      # (Config가 떴다는 것은 RabbitMQ와 Zipkin도 떴다는 의미)
      config-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8761/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # --- 3. 나머지 함대 (병렬 시작) ---
  gateway-service:
    build: ./gateway-service
    container_name: gateway-service
    ports:
      - "8000:8000"
    networks:
      - msa-network
    depends_on:
      # 'Config'가 아닌, 'discovery-service' 하나에만 의존합니다. (깔끔한 연쇄 의존)
      discovery-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  user-service:
    build: ./user-service
    container_name: user-service
    networks:
      - msa-network
    depends_on:
      discovery-service:
        condition: service_healthy
    healthcheck:
      # (★주의★) 'localhost:8081' -> user-service의 'server.port'와 일치해야 합니다.
      test: ["CMD", "curl", "-f", "http://localhost:8081/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  order-service:
    build: ./order-service
    container_name: order-service
    networks:
      - msa-network
    depends_on:
      discovery-service:
        condition: service_healthy
    healthcheck:
      # (★주의★) 'localhost:8083' -> order-service의 'server.port'와 일치해야 합니다.
      test: ["CMD", "curl", "-f", "http://localhost:8083/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

# '우리 함대 전용 네트워크' (모든 서비스가 이 '내부망'에 소속)
networks:
  msa-network:
    driver: bridge
```

---

## 4. '우여곡절' 핵심 요약 (4대 '덜컥거림' 해결)

🥇 Gotcha 1: 'localhost'의 이중 함정
컨테이너 환경에서 `localhost`는 '내 PC'가 아니라 '컨테이너 자기 자신'을 의미한다.

- (공통 application.yml):

  - 증상: 
    - config-service가 AmqpConnectException: Connection refused를 발생시키며 unhealthy 상태가 됨. (RabbitMQ 연결 실패)
    - 모든 서비스가 `config-service`로부터 설정을 받아온 후, `Eureka`, `RabbitMQ`, `Zipkin`을 찾지 못함.

  - 원인: 
    - Config 서버가 Git에서 읽어온 '공통 `application.yml`'에 `spring.rabbitmq.host: localhost` 로 작성.
    - Config 서버가 Git에서 읽어온 '공통 `application.yml`'에 `eureka.client.service-url: http://localhost:8761` 작성.

  - 해결: 
    - Git의 공통 설정 파일도 모두 '서비스 이름' (`http://discovery-service:8761`, `spring.rabbitmq.host: rabbitmq`) 등으로 수정 후 Push.

🥈 Gotcha 2: '헬스체크 curl'의 함정

- 증상: `docker-compose up --build` 실행 시 `Task :test FAILED`로 인해 `Dockerfile` 빌드 자체가 실패함.

- 원인: `Dockerfile`의 `RUN ./gradlew build` 명령이 '통합 테스트'(`:test`)를 실행하려 함. 하지만 '빌드 시점'에는 `config-servic`e나 `rabbitmq` 같은 '런타임' 의존성 컨테이너가 아직 떠있지 않음.

- 해결: `Dockerfile`의 빌드 명령을 `RUN ./gradlew build -x test --no-daemon`으로 수정하여, '빌드' 시점에는 '테스트'를 건너뛰도록 함.

🥉 Gotcha 3: 'Zipkin 헬스체크'의 함정

`docker-compose.yml`의 `depends_on: { condition: service_healthy }`는 `healthcheck`에 100% 의존.

- 함정 1 (Actuator 누락): `config-service`에 `actuator` 의존성이 없어 `/actuator/health` 엔드포인트가 `404`를 반환. -> `actuator` 의존성 추가로 해결.

- 함정 2 (`curl` 누락): 우리가 사용한 `eclipse-temurin:17-jre-jammy` 경량 이미지에는 `curl`이 없어 `healthcheck` 명령이 실패. -> `Dockerfile`에 `RUN apt-get install -y curl` 추가로 해결.

- 함정 3 (`zipkin`의 `curl`): '남의 배'인 `openzipkin/zipkin:latest` 이미지에도 `curl`이 없었음. -> **`zipkin` 서비스의 `healthcheck` 블록을 '완전 삭제'**하여 이미지 '내장' 헬스 체크를 사용하도록 함.

🥊 Gotcha 4: '연쇄 의존성'의 함정

- 증상: Zipkin 트레이싱이 동작하지 않음.

- 원인: Spring Boot 3 이전의 `management.tracing.zipkin.endpoint`라는 '비표준' 설정을 사용함.

- 해결: Spring Boot 3 (Micrometer Tracing)의 '표준' 설정인 `management.zipkin.tracing.endpoint: http://zipkin:9411/api/v2/spans `로 수정.