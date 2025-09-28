# 리액티브 프로그래밍: 건축 일지 建築日誌

이 문서는 '리액티브 프로그래밍'이라는 거대한 성을 단계적으로 지어나가는 과정을 기록한 건축 일지입니다.

## 목차
- [Level 1: 패러다임의 전환과 핵심 개념](#level-1-패러다임의-전환과-핵심-개념)
- [Level 2: 외부 세계와의 비동기 통신](#level-2-외부-세계와의-비동기-통신)
- [Level 3: 고급 에러 핸들링 및 비동기 스트림 제어](#level-3-고급-에러-핸들링-및-비동기-스트림-제어)
- [Level 4: 실시간 이벤트 처리와 메시지 큐 (Kafka)](#level-4-실시간-이벤트-처리와-메세지-큐-(kafka))
- [Level 5: 고급 스트림 제어 (배압, Cold & Hot 스트림)](#level-5-고급-스트림-제어-(배압,-cold-&-hot-스트림))

---

## Level 1: 패러다임의 전환과 핵심 개념

오늘 우리는 전통적인 프로그래밍 방식에서 벗어나, 데이터의 흐름과 변화에 반응하는 '리액티브 프로그래밍'의 세계에 첫발을 내디뎠다. 이 문서는 그 첫걸음에 대한 상세한 기록이다.

---

## 🤔 왜 리액티브 프로그래밍이 필요한가? (Spring MVC vs WebFlux)

우리는 `Spring Reactive Web` 의존성을 추가하며 학습을 시작했다. 이는 기존의 `Spring Web (MVC)`와 근본적으로 다른 방식으로 동작하기에, 그 차이를 이해하는 것이 모든 것의 출발점이다.

### 비유: 레스토랑의 웨이터

- **Spring Web MVC: 1인 1테이블 전담 모델 (Blocking)**
  손님(요청)이 오면 웨이터(스레드)가 한 명 배정된다. 이 웨이터는 음식이 나올 때까지 주방 앞을 떠나지 않고 계속 기다려야만 한다. 이는 로직이 단순하지만, 손님이 많아지면 그만큼 많은 웨이터가 필요해 비효율적이다.

- **Spring WebFlux: 소수 정예 이벤트 루프 모델 (Non-Blocking)**
  소수의 웨이터(스레드)가 여러 테이블을 동시에 담당한다. 주문을 주방에 전달하고 기다리지 않고, 즉시 다른 테이블의 주문을 받으러 간다. 주방에서 요리가 완성되었다는 '신호(이벤트)'가 오면, 그때 음식을 가져다준다. 적은 자원으로 훨씬 많은 요청을 처리할 수 있는 고효율 방식이다.

| 구분 | Spring Web (MVC) | Spring Reactive Web (WebFlux) |
| :--- | :--- | :--- |
| **스레드 모델** | 요청 당 스레드 1개 (Thread-per-Request) | 이벤트 루프 (Event Loop) |
| **동작 방식** | 동기 (Synchronous), 블로킹 (Blocking) | 비동기 (Asynchronous), 논블로킹 (Non-Blocking) |
| **주요 사용처** | 일반적인 웹 애플리케이션 | 대규모 트래픽, 실시간 데이터 처리 |

---

## 💡 어떻게 Non-Blocking이 가능한가?: 이벤트 루프와 체스 마스터

그렇다면 어떻게 '기다리지 않고' 일하는 것이 가능할까? 그 비밀은 **이벤트 루프(Event Loop)**에 있다.

### 비유: 체스 마스터와 30명의 도전자들 ♟️

전통적인 방식은, 체스 마스터(스레드)가 1번 도전자와 경기가 끝날 때까지 꼼짝 않고 기다리는 것이다.

리액티브 방식의 마스터는 다르다.
1.  **빠른 처리:** 1번 도전자에게 가서 수를 둔다. (빠른 작업)
2.  **작업 위임:** 1번 도전자가 다음 수를 고민하는 동안(느린 작업, 예: I/O), 마스터는 기다리지 않고 심판(시스템)에게 **"저 선수가 준비되면 알려주세요"**라고 맡긴다.
3.  **다른 작업 처리:** 마스터는 즉시 2번, 3번 도전자에게 가서 똑같이 일한다. 마스터의 시간은 절대 낭비되지 않는다.
4.  **이벤트 통지:** 1번 도전자가 준비되면 심판이 마스터에게 알려주고, 마스터는 그때 다시 1번 도전자에게 돌아가 수를 둔다.

이처럼 이벤트 루프 스레드는 **'계속 지켜보는 것'이 아니라, '자리를 비웠다가 호출을 받으면 돌아오는'** 방식으로 일한다. 덕분에 소수의 스레드로 수많은 요청의 '대기 시간'을 효율적으로 활용할 수 있다.

---

## 🔎 Java Stream API와 무엇이 다른가? (Flux & Mono)

리액티브 스트림을 구현하기 위해 `Flux`와 `Mono`를 사용했다. 이는 우리가 익숙하게 사용하던 Java의 `Stream` API와는 중요한 차이가 있다.

### 비유: 영화 감상

- **Java Stream API: 영화 파일 다운로드 (Pull-based)**
  `collect()` 같은 최종 연산을 호출하면, 소비자가 데이터를 적극적으로 당겨온다(Pull). 영화 파일 전체가 내 컴퓨터에 다운로드될 때까지 프로그램은 기다려야(Blocking) 한다.

- **Reactor (Flux/Mono): 유튜브 스트리밍 (Push-based)**
  `subscribe()`로 구독을 시작하면, 서버가 데이터 조각(Chunk)을 준비되는 대로 계속 밀어준다(Push). 전체 영상이 없어도 앞부분부터 감상할 수 있으며, 기다리는 동안 다른 작업을 할 수 있다(Non-Blocking).

| 구분 | Java Stream API | Reactor (Flux/Mono) |
| :--- | :--- | :--- |
| **데이터 흐름** | Pull (소비자가 당김) | Push (생산자가 밀어줌) |
| **동작 방식** | 동기 (Synchronous) | 비동기 (Asynchronous) |
| **주요 사용처** | 메모리 내 컬렉션 데이터 처리 | 네트워크, DB 등 비동기 데이터 소스 처리 |
| **종류** | `Stream<T>` (N개) | `Flux<T>` (0..N개), `Mono<T>` (0..1개) |

---

## ⚙️ 스트림 제어하기: 핵심 오퍼레이터

데이터의 흐름(Stream)을 구독하고, 발생하는 신호(`onNext`, `onError`, `onCompleted`)에 반응하는 것이 리액티브 프로그래밍의 핵심이다. '오퍼레이터'는 이 흐름을 원하는 대로 제어하는 마법 도구다.

- **`map`**: 각 데이터를 다른 데이터로 1:1 변환한다. (사과 -> 사과주스)
- **`filter`**: 특정 조건에 맞는 데이터만 통과시킨다.
- **`delayElements`**: 각 데이터 사이에 시간 지연을 추가하여 스트리밍 효과를 확인했다.
- **`onErrorReturn`**: `onError` 신호가 발생했을 때, 스트림을 멈추는 대신 지정된 기본값을 반환하고 정상 종료시킨다.
- **`merge`**: 두 스트림을 동시에 구독하여, 도착하는 순서대로 하나의 스트림으로 합친다. (순서 보장 X)
- **`concat`**: 첫 번째 스트림이 완전히 끝난 후, 다음 스트림을 이어붙인다. (순서 보장 O)
- **`flatMap`**: 각 데이터를 새로운 스트림으로 변환한 후, 이 스트림들을 `merge` 방식으로 합친다. (병렬 처리, 순서 보장 X)
- **`concatMap`**: 각 데이터를 새로운 스트림으로 변환한 후, 이 스트림들을 `concat` 방식으로 이어붙인다. (직렬 처리, 순서 보장 O)

---

## Level 2: 외부 세계와의 비동기 통신

리액티브의 기초를 다진 오늘, 우리는 `WebClient`를 사용하여 외부 API와 **논블로킹(Non-Blocking)**으로 통신하는 방법을 배웠다. 이를 통해 '기다리지 않는 작업'이 실제 애플리케이션에서 어떻게 성능적 이점을 가져오는지 직접 확인했다.

### ⚙️ 핵심 도구: `WebClient`

`WebClient`는 논블로킹 HTTP 클라이언트로, 리액티브 생태계에서 외부 API를 호출하는 표준 방식이다. `@Configuration`을 통해 Bean으로 등록하여 프로젝트 전반에서 재사용하도록 설정했다.

```java
@Bean
public WebClient webClient() {
    return WebClient.builder()
            .baseUrl("https://jsonplaceholder.typicode.com")
            .build();
}
```
---

## 📝 주요 학습 내용
1. **DTO 변환 (`bodyToMono`)**
    - API 응답으로 받은 JSON 문자열을 단순 `String`이 아닌, 구조화된 `Post DTO` 객체로 자동 변환
    - 타입 안정성을 확보하여 데이터 처리의 안정성과 가독성을 향상
2. **결과 가공 (`map`)**:
    - `map` 오퍼레이터를 사용하여 `Post` 객체에서 우리가 필요한 `title`과 `body` 정보만 추출
    - `PostResponse`라는 새로운 DTO로 변환하여 API 응답을 깔끔하게 가공했다.
3. **여러 비동기 작업 조합 (`Mono.zip`)**:
    - 두 개의 API 호출(`Mono<Post>`)을 동시에 실행하고, 두 응답이 모두 도착했을 때 결과를 안전하게 조합하는 `Mono.zip`을 학습했다. 
    - 이는 여러 마이크로서비스의 응답을 합치는 등 실용적인 시나리오에서 매우 유용하다.

---

## 🤔 리액티브, 만능 스포츠카인가? (현실에서의 위치)

리액티브 프로그래밍은 **엄청난 성능적 이점**을 제공하지만, 모든 상황에 맞는 **만능 해결책은 아니다**.

### 🏎️ 언제 강력한가? (스포츠카가 달릴 서킷)

- **마이크로서비스 아키텍처 (MSA)**  
  수많은 서비스 간의 I/O 호출이 빈번한 환경
- **대규모 실시간 서비스**  
  동시 연결이 많고 데이터 스트리밍이 필요한 서비스
- **API 게이트웨이**  
  모든 요청을 받아 분산시키는 I/O 중심의 관문

### 🚙 왜 여전히 MVC가 대세인가? (어떤 길이든 가는 SUV)

- **단순함과 생산성**  
  코드의 흐름이 직관적이라 대부분의 웹 애플리케이션 개발에 유리
- **CPU 중심 작업**  
  I/O 대기가 거의 없는 복잡한 계산에는 논블로킹의 이점이 적음
- **거대한 기존 생태계**  
  JPA/JDBC 등 블로킹 기반의 수많은 라이브러리와 호환성

### ✅ 결론
- 리액티브(WebFlux)와 전통적인 방식(MVC)은 **대체 관계가 아닌 상호 보완 관계**이다.  
- 개발자는 해결하려는 문제의 성격에 따라 **가장 적합한 도구**를 선택할 수 있는 더 넓은 선택지를 갖게 된다.

---

## Level 3: 고급 에러 핸들링 및 비동기 스트림 제어

### 1. 재시도(Retry) 전략

- **`retry(N)`**: N번 만큼 작업을 다시 구독하여 단순 재시도.
- **`retryWhen(Retry)`**: 지연 시간(backoff), 특정 조건 필터링 등 스마트한 재시도 정책 구현.

### 2. 에러 대체(Fallback) 전략

- **`onErrorReturn()`**: 에러 발생 시, 스트림을 중단하고 지정된 **고정값** 반환.
- **`onErrorResume()`**: 에러 발생 시, 대체할 **새로운 스트림(Publisher)**을 동적으로 생성하여 반환.

### 3. 에러 무시 및 스트림 계속 진행

- **`onErrorContinue()`**: `Flux` 스트림의 특정 데이터 에러 시, 전체 중단 없이 해당 데이터만 건너뛰고 계속 진행.
- **`flatMap` 내부 에러 처리**: `flatMap`의 내부 스트림 에러는 `Mono.empty()`로 처리하여 메인 스트림 중단 방지.

### 4. 비동기 작업의 동시성 제어 (Concurrency Control)

- **`flatMap(transform, concurrency)`**: `concurrency` 파라미터로 동시 처리 작업의 최대 개수 제한. 외부 시스템 부하 조절에 유용.
- **동작 원리**: 작업 **시작**은 순서를 따르나, **처리**는 `concurrency` 개수만큼 동시에 진행.

---

## 💻 핵심 코드 (`findUserDetailsById` 메소드)

여러 사용자 정보를 조회하는 API를 통해 위 개념들을 종합적으로 실습

- **ID: 3 (데이터 오류)**: `onErrorResume`과 `Mono.empty()`를 사용해 해당 사용자만 건너뛰기
- **ID: 4 (일시적 네트워크 오류)**: `retryWhen`을 사용해 1초 간격으로 2번 재시도
- **재시도 최종 실패 시**: 가장 바깥의 `onErrorResume`으로 사용자에게 안정적인 대체 메시지 반환
- 
```java
// findUserDetailsById 메소드
private Mono<String> findUserDetailsById(long userId) {
    return Mono.defer(() -> {
                if (userId == 3) {
                    return Mono.error(new RuntimeException("InvalidUserDataError"));
                }
                if (userId == 4) {
                    return Mono.error(new RuntimeException("TemporaryNetworkError"));
                }
                return Mono.just("사용자 정보 조회 성공! [ID: " + userId + "]");
            })
            .onErrorResume(error -> {
                if (error.getMessage().contains("InvalidUserDataError")) {
                    System.out.println("‼️ 데이터 처리 불가, 건너뜁니다. ID: " + userId);
                    return Mono.empty();
                }
                return Mono.error(error);
            })
            .retryWhen(Retry.backoff(2, Duration.ofSeconds(1))
                    .filter(error -> error.getMessage().contains("TemporaryNetworkError"))
            );
```

---

## Level 4: 실시간 이벤트 처리와 메시지 큐 (Kafka)

## 🚀 핵심 학습 내용

### 1. Kafka 기본 개념 및 환경 설정

- **Kafka**: '멈추지 않는 초고속 컨베이어 벨트'에 비유. Producer(생산자), Consumer(소비자), Topic(주제)으로 구성된 메시지 브로커.
- **환경 설정**: `docker-compose.yml`을 사용하여 Kafka와 Zookeeper 컨테이너를 실행. `application.yml`에 `bootstrap-servers`와 `serializer`/`deserializer` 설정.

### 2. 기본 Producer/Consumer 구현 (String)

- **`KafkaTemplate<String, String>`**: Producer에서 문자열 메시지를 특정 토픽으로 발송하기 위해 사용.
- **`@KafkaListener`**: Consumer에서 특정 토픽을 구독하고, 메시지가 들어오면 지정된 메소드를 실행하는 핵심 어노테이션.

### 3. 심화 Producer/Consumer 구현 (JSON Object)

- **DTO (Data Transfer Object)**: 주고받을 객체의 구조를 정의하는 클래스.
- **`JsonSerializer` / `JsonDeserializer`**: 객체를 JSON 문자열로 변환하고, 그 반대 과정을 수행. `application.yml`에서 설정.
- **`spring.json.trusted.packages`**: `JsonDeserializer`가 역직렬화를 허용할 패키지를 지정하는 보안 설정.

---

## 💻 핵심 코드

#### `docker-compose.yml`
```yaml
# Kafka와 Zookeeper 실행을 위한 Docker Compose 설정
version: '3'
services:
  zookeeper:
    # ...
  kafka:
    # ...
```

#### `@KafkaListener` (Consumer)
```java
// JSON 형태의 DTO를 자동으로 변환하여 수신
  @KafkaListener(topics = "my-topic", groupId = "my-group")
  public void listen(MessageDto message) {
System.out.println("📥 메시지 수신: " + message.toString());
}
```

#### `application.yml`  (JSON 설정)
```yaml
spring:
  kafka:
    producer:
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
    consumer:
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "*"
```
---
## Level 5: 고급 스트림 제어 (배압, Cold & Hot 스트림)

## 🚀 핵심 학습 내용

### 1. 배압(Backpressure) 전략

- **문제 정의**: 생산자의 데이터 발행 속도가 소비자의 처리 속도보다 빨라 데이터가 누적되어 시스템 장애(`OverflowException`)를 유발하는 현상.
- **문제 재현**: 배압 제어가 없는 `Sinks` API와 별도 스레드를 사용하여 의도적으로 문제를 발생시키는 과정을 통해 원인을 깊이 이해함.
- **핵심 해결 전략 비교**:

| 구분 | `onBackpressureBuffer()` | `onBackpressureDrop()` | `onBackpressureLatest()` |
| :--- | :--- | :--- | :--- |
| **비유** | 요리 대기 테이블 | 꽉 찬 우체통 (새 편지 버림) | 꽉 찬 우체통 (헌 편지 버림) |
| **전략** | 버퍼에 데이터를 **쌓아둠** | 들어오는 **새 데이터**를 버림 | **기존 데이터**를 버리고 새 데이터 보관 |
| **데이터 유실**| **없음** (버퍼 한도 내) | **있음** (버퍼가 찬 동안의 모든 데이터) | **있음** (최신 데이터 1개 제외 모두) |

### 2. 차가운(Cold) 스트림 vs. 뜨거운(Hot) 스트림

- **차가운 스트림 (Cold Publisher)**: '주문 제작 DVD'에 비유. **구독할 때마다** 각 구독자를 위해 독립적인 데이터 스트림이 처음부터 새로 생성됨.
- **뜨거운 스트림 (Hot Publisher)**: '생방송 라디오'에 비유. 구독 여부와 관계없이 데이터 스트림은 하나만 존재하며, 구독자는 **중간부터 참여하여** 동일한 스트림을 실시간으로 공유함.
- **핵심 연산자**:
    - `publish()`: Cold 스트림을 수동 제어 가능한 `ConnectableFlux`(뜨거운 스트림)로 변환.
    - `connect()`: `ConnectableFlux`의 데이터 발행을 시작시키는 '방송 시작' 버튼.
    - `autoConnect(N)`: N명의 구독자가 생기면 자동으로 `connect()`를 호출해주는 편리한 연산자.
    - `blockLast()`: `main` 메소드 등에서 비동기 스트림이 완료될 때까지 안정적으로 대기하는 방법. `Thread.sleep`의 불편함을 해결함.

---

## 💻 핵심 코드

#### 배압 문제 해결 (`Buffer` 전략)
```java
// Sinks를 이용한 외부 주입 및 버퍼링으로 데이터 유실 없이 배압 제어
Sinks.Many<Integer> sink = Sinks.many().multicast().onBackpressureBuffer();

sink.asFlux()
    .publishOn(Schedulers.single())
    .subscribe(data -> { // 느린 소비자
        Thread.sleep(100);
    });

new Thread(() -> { // 빠른 생산자
    for (int i = 1; i <= 50; i++) {
        sink.tryEmitNext(i);
    }
}).start();
```

#### 뜨거운 스트림 생성 (`autoConnect`)
```java
// 1명의 구독자가 생기면 자동으로 방송을 시작하는 뜨거운 스트림
Flux<Long> hotFlux = Flux.interval(Duration.ofSeconds(1))
                        .take(5)
                        .publish()
                        .autoConnect(1);

// A는 시작부터, B는 2.5초 뒤에 참여하지만 같은 스트림을 공유
hotFlux.subscribe(data -> log.info("Subscriber A: {}", data));
Thread.sleep(2500);
hotFlux.subscribe(data -> log.info("Subscriber B: {}", data));

// 스트림이 끝날 때까지 대기
hotFlux.blockLast();
```