# Level 3: 고성능 자바 코딩 패턴 (Master Class)

## 📝 학습 목표

- 단순히 동작하는 코드를 넘어, 성능과 가독성을 모두 고려한 '좋은 코드'를 작성하는 능력을 기름.
- 컬렉션, 문자열 등 자바의 핵심 요소를 사용할 때 발생하는 보이지 않는 비용을 이해하고 최적화하는 방법을 학습함.
- 성능을 고려한 설계 패턴과 흔히 발생하는 성능 저하 코드 패턴을 식별하고 개선하는 능력을 배양함.

---

## 🚀 핵심 학습 내용

### 1장: 컬렉션과 스트림 최적화

- **빈 컬렉션 반환**: `new ArrayList<>()`(매번 새 쇼핑백 주문) 대신 `List.of()`(공유 쇼핑백 재사용)를 사용하여 불필요한 객체 생성을 방지.

- **초기 크기 지정**: 데이터 개수를 예측 가능할 때 `new ArrayList<>(size)`(큰 상자 미리 준비)를 사용하여, 데이터 추가 시 발생하는 비싼 '내부 배열 복사' 작업을 제거.

- **`ArrayList` vs. `LinkedList`**: 대부분의 경우 임의 접근(get)이 빠른 `ArrayList`가 정답.

| 구분 | `ArrayList` (아파트 🏢) | `LinkedList` (기차 🚂) |
| :--- | :--- | :--- |
| **데이터 구조** | 배열 (Array) | 연결 리스트 (Linked List) |
| **조회 (`get`)** | **🥇 매우 빠름 (O(1))** | 🐢 매우 느림 (O(n)) |
| **중간 추가/삭제** | 🐢 매우 느림 (O(n)) | **🥇 매우 빠름 (O(1))** |

- **Stream API**: '푸드 프로세서'처럼 편리하고 가독성이 뛰어나 기본적으로 사용을 권장. 단, 프로파일러가 병목으로 지목한 극히 일부 성능 민감 구간에서는 '숙련된 요리사'와 같은 `for` 루프를 고려.

### 2장: 자바 언어 자체의 최적화

- **문자열 처리**: 상황에 맞는 최적의 도구를 사용.

| 방법 | 비유 | 장점 | 단점 | 추천 상황 |
| :--- | :--- | :--- | :--- | :--- |
| **`+` (반복문)** | 😭 매번 새 차 조립 | - | **매우 비효율적** | **사용 금지** |
| **`StringBuilder`**| 🏗️ 조립 라인 | **최고 효율** | 코드 약간 길어짐 | 반복적인 문자열 조합 |
| **`String.join()`**| 🚀 최종 조립 로봇 | **간결, 고성능** | 구분자만 가능 | 리스트/배열 연결 |
| **`String.format()`**| 🖨️ 서식 출력기 | **가독성** | 상대적으로 느림 | 복잡한 템플릿 |

- **기본 타입 vs. 래퍼 타입**: 성능이 중요한 반복 연산에서는 '쪽지'와 같은 기본 타입(`int`)을, 객체 기능이 필요할 때는 '고급 상자'와 같은 래퍼 타입(`Integer`)을 사용.

```java
// 나쁨: 불필요한 Long 객체 생성 반복
Long sum = 0L;
for (long i = 0; i < 1_000_000_000; i++) { sum += i; }

// 좋음: 순수한 숫자 연산만 수행
long sum = 0L;
for (long i = 0; i < 1_000_000_000; i++) { sum += i; }
```
- **모던 자바 문법**: `Record`와 `switch` 표현식으로 가독성과 안정성을 모두 확보.
```java
// Before: 수십 줄의 보일러플레이트
public final class OldUser { /* ... 생성자, getter, equals, hashCode ... */ }

// After: 단 한 줄로 불변 DTO 완성
public record User(Long id, String name) {}
```

### 3장: 성능을 고려한 설계

- **오브젝트 풀 패턴**: '렌터카 회사'처럼, 생성 비용이 비싼 객체(DB 커넥션 등)는 미리 만들어 둔 '풀'에서 빌려 쓰고 반납하여 재사용.
- **플라이웨이트 패턴**: '글꼴'처럼, 여러 객체가 공유하는 공통 부분을 분리하여 단 하나의 객체로 공유. (예: `Integer.valueOf()`)
- **불변성 패턴**: '도자기'처럼, 생성 후 상태 변경이 불가능한 '불변 객체'는 동시성 문제의 원천 해결책이자 캐싱에 최적화된 '치트키'.
- **지연 로딩**: '일품요리 레스토랑'처럼, 객체 생성을 실제 사용 시점까지 미루어(`@Lazy`) 애플리케이션 초기 구동 속도 향상.

### 4장: 피해야 할 성능 함정
- **제어 흐름을 위한 예외 사용**: '식물에 물 주려고 소화기 쓰는 격'. 예외 생성은 매우 비싸므로, 예측 가능한 로직 분기에는 절대 사용 금지.
```java
// 나쁨: "abc"가 들어올 때마다 비싼 예외 발생
try { Integer.parseInt(s); return true; } catch (NumberFormatException e) { return false; }

// 좋음: 단순 조건문으로 빠른 처리
for (char c : s.toCharArray()) { if (!Character.isDigit(c)) return false; }
return true;
```
- **과도한 동기화**: '도서관 전체에 자물쇠 하나 거는 격'. `synchronized`는 필요 최소한의 범위('과학 코너'에만 잠금)에만 적용하고, 더 가볍고 빠른 `Atomic` 클래스 사용을 우선 고려.
```java
// 나쁨: incrementA()와 incrementB()가 서로를 막음
public synchronized void incrementA() { countA++; }
public synchronized void incrementB() { countB++; }

// 좋음: 서로 다른 락으로 병렬 처리 가능
private final Object lockA = new Object();
public void incrementA() { synchronized (lockA) { countA++; } }

// 최고: 락 없이(Lock-Free) 원자적으로 연산
private final AtomicInteger countA = new AtomicInteger(0);
public void incrementA() { countA.incrementAndGet(); }
```
