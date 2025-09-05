# 실전 통합 복습 프로젝트: 실시간 조회수 카운터

## 1. 프로젝트 목표
- **기능**: 특정 게시물의 실시간 조회수를 보여주는 API 개발.
- **요구사항**:
    1. 조회수는 성능을 위해 **Redis**에 먼저 기록한다.
    2. Redis에 누적된 조회수는 **5분마다 스프링 스케줄러**를 통해 DB에 업데이트한다. (실습에서는 로그로 대체)
    3. 전체 시스템(애플리케이션 + Redis)은 **도커**로 한 번에 실행되어야 한다.

---
## 2. 최종 구현 소스코드

### 2-1. `docker-compose.yml`
> 애플리케이션과 Redis 컨테이너를 함께 실행하고, 서비스 이름(`my-review-redis`)으로 서로 통신할 수 있도록 구성했다.

```yaml
services:
  my-review-app:
    # 현재 폴더의 Dockerfile을 사용하여 이미지를 빌드
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - my-review-redis
    environment:
      # application.yml의 host 설정을 이 서비스 이름으로 지정
      - SPRING_DATA_REDIS_HOST=my-review-redis

  my-review-redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### 2-2. `Dockerfile`
> Spring Boot 애플리케이션을 실행 가능한 이미지로 패키징했다.

```dockerfile
# Java 17 실행 환경을 베이스 이미지로 사용
FROM openjdk:17-jdk-slim

# 빌드된 jar 파일을 컨테이너 내부로 복사하고 이름을 app.jar로 지정
COPY ./demo/build/libs/*-SNAPSHOT.jar app.jar

# 컨테이너 시작 시 애플리케이션 실행
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

### 2-3. `RedisShedLockConfig.java`
> Spring Boot 애플리케이션을 실행 가능한 이미지로 패키징했다.

```java
@Configuration
@EnableScheduling // 스프링 스케줄러 활성화
@EnableSchedulerLock(defaultLockAtMostFor = "PT30S") // ShedLock 활성화
public class RedisShedLockConfig {

    // ShedLock이 Redis를 락 저장소로 사용하도록 설정하는 Bean
    @Bean
    public LockProvider lockProvider(RedisConnectionFactory connectionFactory) {
        return new RedisLockProvider(connectionFactory);
    }
}
```

### 2-4. `PostViewService.java`
> Redis 조회수 증가 로직과, 5분마다 DB로 동기화하는 스케줄러를 구현했다.

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class PostViewService {

    private final StringRedisTemplate redisTemplate;
    private static final String VIEW_COUNT_KEY_PREFIX = "post:view:count:";

    // 조회수를 1 증가시키는 메서드 (API가 호출)
    public void incrementViewCount(Long postId) {
        String key = VIEW_COUNT_KEY_PREFIX + postId;
        // INCR 명령어를 실행하여 원자적으로 값을 1 증가
        redisTemplate.opsForValue().increment(key);
        log.info("게시물 {}의 조회수가 증가했습니다.", postId);
    }

    // 5분마다 실행되는 DB 동기화 스케줄러
    @Scheduled(cron = "0 */5 * * * *")
    @SchedulerLock(name = "syncViewCountsToDB", lockAtMostFor = "PT4M50S", lockAtLeastFor = "PT1M")
    public void syncViewCountsToDB() {
        log.info("--- 조회수 DB 동기화 작업 시작 (SCAN 방식) ---");

        // SCAN 옵션으로 서버 부하 없이 모든 조회수 키를 가져옴
        ScanOptions options = ScanOptions.scanOptions().match(VIEW_COUNT_KEY_PREFIX + "*").build();
        try (Cursor<String> cursor = redisTemplate.scan(options)) {
            while (cursor.hasNext()) {
                String key = cursor.next();
                String viewCount = redisTemplate.opsForValue().get(key);
                log.info("DB에 저장 >> {} | 조회수: {}", key, viewCount);
            }
        }
        log.info("--- 조회수 DB 동기화 작업 완료 ---");
    }
}
```
---
## 3. 학습한 내용
> 이번 통합 실습을 통해 도커로 개발 환경을 구성하고, Redis를 이용해 실시간 데이터를 효율적으로 처리하며, 스프링 스케줄러와 ShedLock으로 안정적인 주기적 작업을 실행하는, 현대적인 백엔드 시스템의 핵심 구성 요소를 직접 구현하는 경험을 쌓았다.