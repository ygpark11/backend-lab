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