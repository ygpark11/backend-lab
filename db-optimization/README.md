# Level 1: 데이터베이스 쿼리 최적화 (인덱스 & N+1 문제)

🗓️ **날짜**: 2025-10-05

## 📝 학습 목표

- 대용량 데이터 환경에서 발생하는 느린 쿼리의 원인을 직접 체험하고 분석하는 것을 목표로 함.
- 데이터베이스 인덱스(Index)의 원리를 이해하고, 적용 시 발생하는 극적인 성능 향상을 확인함.
- JPA 사용 시 가장 흔한 성능 저하 원인인 N+1 문제의 발생 원인을 파악하고, Fetch Join을 통해 해결하는 능력을 기름.

## 📚 학습 목차

1.  **[인덱스(Index): 느린 쿼리의 해결사](#1-인덱스index-느린-쿼리의-해결사)**
2.  **[N+1 문제와 Fetch Join](#2-n1-문제와-fetch-join)**

---

## 🚀 핵심 학습 내용

### 1. 인덱스(Index): 느린 쿼리의 해결사

- **문제 상황 (Full Table Scan)**: 인덱스가 없는 컬럼을 조회 조건(`WHERE`)으로 사용 시, 데이터베이스는 테이블의 모든 데이터를 처음부터 끝까지 스캔함. 이는 데이터가 많아질수록 성능 저하의 주범이 됨.
    - **`EXPLAIN PLAN`**: SQL 실행 계획을 통해 데이터베이스가 `tableScan`을 수행했는지 직접 확인.
- **해결책 (인덱스)**: 특정 컬럼에 인덱스를 생성하면, 데이터베이스는 해당 컬럼의 데이터를 미리 정렬된 상태로 유지함. 이를 통해 Full Table Scan 대신 훨씬 빠른 인덱스 검색을 수행.
    - **JPA 적용**: `@Table` 어노테이션의 `indexes` 속성을 사용하여 엔티티 레벨에서 인덱스 생성을 관리.

### 2. N+1 문제와 Fetch Join

- **문제 상황 (N+1 Query Problem)**: 연관 관계가 있는 엔티티 조회 시(`@ManyToOne(fetch = FetchType.EAGER)`), 첫 쿼리(1) 이후 연관된 엔티티를 조회하기 위해 N개의 추가 쿼리가 발생하는 현상. `findAll()` 한 번이 실제로는 11번, 101번의 쿼리를 유발할 수 있음.
- **해결책 (Fetch Join)**: JPQL의 `JOIN FETCH` 문법을 사용하여, 첫 쿼리를 실행할 때 연관된 엔티티까지 SQL `JOIN`을 통해 한 번에 모두 가져오도록 JPA에게 명시적으로 지시. 이를 통해 N개의 추가 쿼리를 원천적으로 차단.

---

## 💻 핵심 코드

#### 인덱스 설정 (JPA)
```java
// User.java
@Entity
@Table(name = "users", indexes = @Index(name = "idx_email", columnList = "email"))
public class User {
    // ...
}
```

#### N+1 해결 (Fetch Join)
```java
// PostRepository.java
public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("SELECT p FROM Post p JOIN FETCH p.user")
    List<Post> findAllWithUser();
}
```