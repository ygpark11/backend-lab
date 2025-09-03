# 실무 적용: 분산 환경 스케줄러 구현 (Spring Scheduler + ShedLock + Redis)

## 1. 목표
쿠버네티스 환경과 같이 여러 개의 애플리케이션 인스턴스(파드)가 동시에 실행되는 분산 환경에서, 스프링 스케줄러가 중복 실행되지 않고 단 하나의 인스턴스에서만 안전하게 동작하도록 구성한다.

- **핵심 전략**: ShedLock 라이브러리를 사용하여 분산 락(Distributed Lock)을 구현한다.
- **락 저장소**: Redis를 사용하며, 안정성을 위해 캐시/세션용 DB와 락 전용 DB를 논리적으로 분리한다.

---
## 2. 구현 단계

### 2-1. `pom.xml` 의존성 추가
ShedLock과 Spring Data Redis를 사용하기 위해 아래 의존성들을 추가한다.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>

<dependency>
    <groupId>net.javacrumbs.shedlock</groupId>
    <artifactId>shedlock-spring</artifactId>
    <version>5.10.1</version>
</dependency>

<dependency>
    <groupId>net.javacrumbs.shedlock</groupId>
    <artifactId>shedlock-provider-redis-spring</artifactId>
    <version>5.10.1</version>
</dependency>
```

### 2-2. `application.yml` 설정
> ShedLock만을 위한 `database` 설정을 추가한다.

```yaml
spring:
  redis:
    masterName: "mymaster"
    password: "123456789"
    k8s:
      sentinelPort: 26379
      namespace: "redis-namespace"
      serviceName: "redis-service"
    # --- ShedLock 전용 DB 설정 추가 ---
    shedlock:
      database: 1 # ShedLock은 1번 DB를 사용
```

### 2-3. 기존 Redis 설정 (RedisConfig.java)
> 기존 `redisConnectionFactory` Bean 에 `@Primary` 어노테이션을 추가하여, 애플리케이션의 '기본' Redis 연결임을 명시한다.

```java
@Configuration
@Profile("!local")
public class RedisConfig {
// ... (기존 코드는 그대로) ...

    @Bean
    @Primary // 여러 Redis 연결 설정 중, 이것이 '대표'임을 선언
    public LettuceConnectionFactory redisConnectionFactory() {
        // ... (이 메서드는 기본 0번 DB를 사용하는 연결을 생성) ...
    }
    
    // ...
}
```

### 2-4. ShedLock 전용 Redis 설정 (ShedLockConfig.java)
> ShedLock만을 위한 별도의 연결 설정을 생성한다. 이 설정은 1번 DB를 사용하도록 구성한다.

```java
@Configuration
@EnableSchedulerLock(defaultLockAtMostFor = "PT30S")
@Profile("!local")
public class ShedLockConfig {

    @Value("${redis.shedlock.database}")
    private int SHEDLOCK_DB;

    // ShedLock 전용 ConnectionFactory Bean 생성
    @Bean
    public RedisConnectionFactory redisShedLockConnectionFactory(
            // ... (@Value 파라미터들) ...
    ) {
        // ... (Sentinel 접속 로직은 RedisConfig와 동일) ...

        // --- 핵심: 락 전용 DB를 1번으로 지정 ---
        sentinelConfig.setDatabase(SHEDLOCK_DB);

        return new LettuceConnectionFactory(sentinelConfig);
    }

    // ShedLock의 LockProvider가 'ShedLock 전용' 연결 설정을 사용하도록 명시적으로 주입
    @Bean
    public LockProvider lockProvider(@Qualifier("redisShedLockConnectionFactory") RedisConnectionFactory connectionFactory) {
        return new RedisProvider(connectionFactory);
    }
}
```

### 2-5. 스케줄러 구현 (TestScheduler.java)
> `@Scheduled` 어노테이션 위에 `@SchedulerLock`을 추가하여 분산 락을 적용한다.

```java
@Slf4j
@Component
@EnableScheduling
public class TestScheduler {

    @Scheduled(cron = "*/30 * * * * *")
    @SchedulerLock(name = "testScheduler", lockAtLeastFor = "PT29S", lockAtMostFor = "PT29S")
    public void runScheduler() {
        log.info("runScheduler() called");
    }
}
```