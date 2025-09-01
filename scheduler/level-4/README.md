# 스프링 스케줄러 학습 - Level 4: 분산 환경 최종 실습

## 1. 핵심 개념 정리
- **`@SchedulerLock`**: `@Scheduled` 어노테이션과 함께 사용하여, 분산 환경에서 스케줄러의 중복 실행을 방지하는 ShedLock의 핵심 어노테이션.
- **분산 락(Distributed Lock)**: 여러 서버가 동시에 작업을 시도할 때, 외부의 공용 저장소(Redis 등)를 '예약 보드'처럼 사용하여 오직 하나의 서버만 락(Lock)을 획득하고 작업을 실행하도록 보장하는 기술.

## 2. 실습 기록

### 2-1. 프로젝트 구성
- **Dependencies**: `Spring Web`, `Spring Data Redis`, `Lombok`, `ShedLock` 관련 라이브러리 2종
- **`ShedLockConfig.java`**: `@EnableSchedulerLock`으로 ShedLock을 활성화하고, `RedisLockProvider`를 Bean으로 등록하여 락 저장소로 Redis를 사용하도록 설정했다.
- **`docker-compose.yml`**: `replicas: 2` 옵션을 사용하여, 스케줄러 애플리케이션을 2대의 서버에서 실행되는 상황으로 시뮬레이션했다.

### 2-2. 핵심 소스코드 (`DistributedScheduler.java`)
```java
@Slf4j
@Component
@EnableScheduling
public class DistributedScheduler {

    // 10초마다 실행되지만, 9초 동안 락을 유지한다.
    @Scheduled(cron = "*/10 * * * * *")
    @SchedulerLock(name = "sendEmailTask", lockAtMostFor = "PT9S", lockAtLeastFor = "PT9S")
    public void sendEmailToUsers() {
        log.info("분산 락 성공! 이메일 발송 작업을 시작합니다.");
    }
}
```

### 2-3. 중복 실행 방지 확인

- `./gradlew build`로 `.jar` 파일을 생성했다.
- `docker-compose up --build` 명령어로 애플리케이션 컨테이너 2대와 Redis 컨테이너 1대를 실행했다.
- `docker-compose logs -f`로 전체 로그를 확인했다.
- **결과**: 애플리케이션 컨테이너는 2대였지만, 10초마다 "분산 락 성공!" 로그는 **오직 하나의 컨테이너에서만** 출력되는 것을 확인했다.
- **증명**: ShedLock이 Redis를 통해 성공적으로 분산 락을 구현하여, 스케줄러의 중복 실행을 완벽하게 방지했음이 증명되었다.

---

## 3. 학습한 내용

- 이번 실습을 통해 Spring Boot, `@Scheduled`, ShedLock, Docker, Redis 기술을 모두 조합하여, 실제 운영 환경에서도 안전하게 동작하는 분산 스케줄러를 구축하는 전 과정을 체득했다.
---

## 4. 심화 학습: 실무를 위한 설계

### 4-1. 캐시와 락의 DB 분리
- **문제점**: 캐시 데이터와 ShedLock의 락(Lock) 데이터를 같은 DB(기본값 0번)에 저장하면, 캐시 전체를 삭제하는 `FLUSHDB` 명령어 실행 시 락 정보까지 함께 사라져 스케줄러가 오작동할 수 있다.
- **해결책**: 애플리케이션에서 Redis에 접속하는 두 개의 서로 다른 `RedisConnectionFactory` Bean을 생성하여, 캐시는 0번 DB, 락은 1번 DB를 사용하도록 명시적으로 분리한다.
- **결론**: '사라져도 괜찮은 데이터(캐시)'와 '사라지면 안 되는 데이터(락)'는 반드시 다른 저장소에 보관하는 것이 안전한 설계의 기본이다.

### 4-2. `lockAtMostFor`와 `lockAtLeastFor` 시간 설정
- **상황**: 10초마다 실행되는 스케줄러가 있고, 작업 시간은 10초 이내에 끝나는 경우.
- **추천 설정**: `lockAtMostFor = "9s"`, `lockAtLeastFor = "9s"`
- **이유**:
    - **`lockAtMostFor` (최대 락 시간)**: 실행 주기(10초)보다 약간 짧게 설정하여, 락을 쥔 서버가 다운되어도 다음 주기가 오기 전에 락이 해제되도록 보장한다.
    - **`lockAtLeastFor` (최소 락 시간)**: 작업이 너무 빨리 끝나더라도 다음 주기가 오기 직전까지 락을 유지시켜, 서버 간의 시간 오차로 인한 중복 실행을 방지한다.

### 4-3. `@EnableScheduling` 위치
- **메인 클래스**: 애플리케이션 전역에 스케줄링을 활성화하는 가장 일반적인 방법.
- **스케줄러 컴포넌트**: 스케줄링 관련 설정과 로직을 하나의 파일에 모아 응집도를 높이는, 더 세련되고 모듈화된 방법.
- **결론**: 두 방법 모두 기능적으로 동일하게 동작하며, 프로젝트의 컨벤션에 따라 선택하면 된다.