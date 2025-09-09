# 스프링 배치 학습 - Level 3_5: 데이터베이스에서 데이터 읽기

## 1. 핵심 개념 정리
- **`JpaPagingItemReader`**: JPA를 사용하여 데이터베이스의 대용량 데이터를 읽어오는 표준 컴포넌트. 메모리 부족(`OutOfMemoryError`)을 방지하기 위해 데이터를 '페이지' 단위로 나누어 읽는다.
- **페이징 메커니즘**: `LIMIT`와 `OFFSET`을 사용하는 JPA 쿼리를 반복적으로 실행한다. `pageSize` 속성은 한 번의 쿼리로 가져올 데이터의 수를 결정하며, 데이터 무결성을 위해 쿼리에는 **반드시 `ORDER BY` 절이 포함**되어야 한다.
- **종료 로직**: 한 페이지를 읽어온 데이터의 수가 요청한 `pageSize`보다 적을 경우, 더 이상 읽을 데이터가 없다고 판단하고 스스로 중단한다. 이는 불필요한 마지막 쿼리를 생략하는 최적화 로직이다.
- **함수형 인터페이스 비유**: 청크(Chunk) 기반 Step의 컴포넌트들은 자바의 함수형 인터페이스와 완벽하게 대응되어, 데이터 처리 파이프라인의 역할을 명확하게 보여준다.
    - `ItemReader`는 **`Supplier`** (데이터 공급자)
    - `ItemProcessor`는 **`Function`** (데이터 가공자)
    - `ItemWriter`는 **`Consumer`** (데이터 소비자)

---
## 2. 핵심 코드 (`JpaPagingItemReader` 설정)
```java
@Bean
public JpaPagingItemReader<User> jpaPagingItemReader() {
    return new JpaPagingItemReaderBuilder<User>()
            .name("jpaPagingItemReader")
            .entityManagerFactory(entityManagerFactory)
            .pageSize(CHUNK_SIZE)
            .queryString("SELECT u FROM User u ORDER BY u.id ASC") // 정렬(ORDER BY) 필수!
            .build();
}
```

---
## 3. 핵심 설정 (`application.yml` 설정)

- `spring.jpa.hibernate.ddl-auto: create-drop`: 개발 환경 설정으로, 애플리케이션 시작 시 `@Entity`를 기준으로 DB 스키마를 생성하고 종료 시 삭제한다.
- `spring.jpa.defer-datasource-initialization: true`: Hibernate의 스키마 생성(`ddl-auto`)이 완료된 이후에 `data.sql` 스크립트가 실행되도록 보장하는 매우 중요한 설정. 실행 순서로 인한 '테이블 없음' 오류를 해결한다.

---
## 4. 실습 Q&A 및 발견
### 왜 쿼리가 예상보다 한 번 더 실행되었는가?
10개의 아이템과 pageSize 2의 조건으로 실험했을 때, 6번의 쿼리가 실행되었다. 처음에는 "빈 결과가 나올 때까지 조회한다"고 추측했다.

### 수정: 최적화 로직의 발견
11개의 아이템으로 추가 실험을 진행한 결과, 쿼리는 여전히 6번만 실행되었다. 이를 통해 **"조회된 데이터 수가 pageSize보다 적으면 중단한다"**는 JpaPagingItemReader의 최적화 로직을 스스로 발견해냈다.

이 실습은 문서나 강의를 맹신하기보다, 직접 테스트하여 프레임워크의 실제 동작을 검증하는 것의 중요성을 깨닫게 해주었다.

---
## 5. 학습한 내용
- `JpaPagingItemReader`를 설정하고 사용하여 실제 데이터베이스로부터 안전하게 데이터를 읽는 방법을 학습했다.
- 데이터 무결성을 위해 페이징 쿼리에서 `ORDER BY`가 왜 필수적인지 이해했다.
- 실험을 통해 `JpaPagingItemReader`의 정확한 종료 로직을 스스로 발견했다.
- `defer-datasource-initialization` 설정을 통해 스프링 부트의 실행 순서 문제를 해결하는 방법을 익혔다.
- 스프링 배치 컴포넌트와 자바 함수형 인터페이스를 연결하여 데이터 처리 파이프라인의 설계를 깊이 이해했다.