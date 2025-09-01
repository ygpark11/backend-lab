# 스프링 스케줄러 학습 - Level 1: 기본 사용법

## 1. 핵심 개념 정리

- **`@EnableScheduling`**: 스프링 부트 애플리케이션에 **"스케줄러 기능을 사용 시작하겠습니다!"** 라고 알리는 시작 스위치. 메인 클래스에 붙여준다.
- **`@Scheduled`**: 특정 메서드에 붙여, 주기적으로 실행되도록 예약하는 '예약 딱지'.
- **스케줄링 옵션**:
    - **`fixedRate`**: '시작 시간 기준'. 이전 작업이 끝나지 않아도 정해진 시간마다 다음 작업을 시작한다.
    - **`fixedDelay`**: '종료 시간 기준'. 이전 작업이 끝난 후, 정해진 시간만큼 쉬었다가 다음 작업을 시작한다.
    - **`cron`**: "매일 새벽 2시 15분"처럼, 복잡한 시간을 지정하는 가장 강력한 옵션.

## 2. 실습 기록

### 2-1. 스케줄러 활성화
`SchedulerApplication.java` 파일에 `@EnableScheduling` 어노테이션을 추가했다.

### 2-2. 스케줄러 컴포넌트 작성 (`SimpleScheduler.java`)
`@Scheduled` 어노테이션을 사용하여 두 개의 주기적인 작업을 만들었다.

```java
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Slf4j
@Component
public class SimpleScheduler {

    // 5초에 한 번씩 실행
    @Scheduled(fixedRate = 5000)
    public void runPeriodically() {
        log.info("fixedRate 스케줄러 실행: {}", LocalDateTime.now());
    }

    // 매 분 10초마다 실행
    @Scheduled(cron = "10 * * * * *")
    public void runAtSpecificTime() {
        log.info("cron 스케줄러 실행: {}", LocalDateTime.now());
    }
}
```
### 2-3. 실행 결과 확인
- 애플리케이션을 실행한 뒤, 콘솔 로그에서 아래와 같이 두 스케줄러가 정상적으로 동작하는 것을 확인했다.
```bash
// (실행 결과 예시)
2025-09-01T18:30:00.001 INFO --- [ scheduling-1] c.e.d.SimpleScheduler : fixedRate 스케줄러 실행: 2025-09-01T18:30:00.001
2025-09-01T18:30:05.002 INFO --- [ scheduling-1] c.e.d.SimpleScheduler : fixedRate 스케줄러 실행: 2025-09-01T18:30:05.002
2025-09-01T18:30:10.000 INFO --- [ scheduling-1] c.e.d.SimpleScheduler : cron 스케줄러 실행: 2025-09-01T18:30:10.000
2025-09-01T18:30:10.003 INFO --- [ scheduling-1] c.e.d.SimpleScheduler : fixedRate 스케줄러 실행: 2025-09-01T18:30:10.003
```

## 3. 학습한 내용
- **`@EnableScheduling`** 과 **`@Scheduled`** 어노테이션만으로 아주 간단하게 주기적인 작업을 만들 수 있음을 확인했다.
- **`fixedRate`** 와 **`cron`** 의 동작 방식 차이를 로그를 통해 직접 눈으로 확인하며 이해했다.