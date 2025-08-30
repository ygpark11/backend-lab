# Redis 학습 - Level 5: 실전! Spring Boot와 Redis 연동

## 1. 핵심 개념 정리
- **Spring Data Redis**: 스프링 애플리케이션에서 Redis를 쉽게 사용하도록 도와주는 라이브러리. `RedisTemplate`과 캐시 추상화를 제공한다.
- **`@Cacheable`**: 특정 메서드의 결과를 자동으로 Redis에 캐싱해주는 마법 같은 어노테이션. AOP 기반으로 동작하며, 동일한 요청에 대해서는 실제 메서드를 실행하지 않고 캐시에서 바로 결과를 반환하여 성능을 극대화한다.
- **`RedisTemplate`**: Redis의 모든 명령어를 자바 코드에서 직접 제어할 수 있는 '수동 공구'. 복잡한 비즈니스 로직 구현에 사용된다.
- **서비스 디스커버리**: `docker-compose.yml` 환경에서, 스프링 부트 애플리케이션은 `localhost`가 아닌 **서비스 이름**(예: `my-redis`)으로 다른 컨테이너에 접속해야 한다.

## 2. 실습 기록

### 2-1. 프로젝트 구성
- **Dependencies**: `Spring Web`, `Spring Data Redis`, `Lombok`
- **`application.yml`**: 스프링 캐시 타입으로 `redis`를 지정하고, Redis 호스트를 `docker-compose.yml`의 서비스 이름인 `my-redis`로 설정했다.
- **`@EnableCaching`**: 메인 클래스에 추가하여 스프링의 캐시 기능을 활성화했다.

### 2-2. 핵심 소스코드

- **`PostService.java` (캐싱 대상 서비스)**
  ```java
  @Slf4j
  @Service
  public class PostService {
      // "popularPosts"라는 캐시 이름으로 결과를 저장한다.
      // 같은 요청이 다시 들어오면, 이 메서드는 실행되지 않고 Redis에서 바로 결과가 반환된다.
      @Cacheable(value = "popularPosts")
      public List<String> getPopularPosts() {
          log.info("DB에서 인기 게시물을 조회합니다... (3초 소요)");
          // DB 조회를 흉내 내기 위한 3초 지연
          try {
              Thread.sleep(3000);
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          }
          return List.of("1위: Redis 마스터하기", "2위: Docker 완전 정복");
      }
  }
  ```
- **`docker-compose.yml` (실행 환경)**
    ```yaml
    services:
      my-app-with-redis:
        # ./demo 폴더에 있는 Dockerfile을 사용하여 이미지를 빌드한다.
        build: ./demo
        ports:
          - "8080:8080"
        depends_on:
          - my-redis
        # application.yml의 설정을 덮어쓰기 위해 환경변수를 주입한다.
        environment:
          - SPRING_DATA_REDIS_HOST=my-redis
    
      my-redis:
        image: redis:alpine
        ports:
          - "6379:6379"
    ```
### 2-3. 캐싱 동작 확인
- `./gradlew build`로 `.jar` 파일을 생성했다.
- `docker-compose up -d --build` 명령어로 `my-app-with-redis`와 `my-redis` 컨테이너를 실행했다.
- 웹 브라우저로 `http://localhost:8080/posts`를 **처음 호출**했다.
    - **결과**: 약 3초의 시간이 걸렸고, 컨테이너 로그에 "DB에서 인기 게시물을 조회합니다..." 메시지가 출력되었다.
- 동일한 주소를 **다시 호출**했다.
    - **결과**: **즉시(0.1초 이내)** 응답이 왔고, 로그에는 아무런 메시지도 출력되지 않았다.
- **증명**: 두 번째 호출은 실제 서비스를 실행하지 않고, Redis에 캐시된 결과를 직접 가져왔음이 증명되었다.

## 3. 학습한 내용
- 이번 실습을 통해 Spring Boot 애플리케이션에서 `@Cacheable` 어노테이션을 사용하여 얼마나 간단하게 조회 성능을 최적화할 수 있는지 체득했다.
- 또한, Docker Compose 환경에서 컨테이너 간 통신은 `localhost`가 아닌 **서비스 이름**을 사용해야 한다는 중요한 네트워크 원리를 다시 한번 확인했다.