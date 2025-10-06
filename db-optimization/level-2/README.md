# Level 1: 데이터베이스 쿼리 최적화 (인덱스 & N+1 문제)

## 📝 학습 목표

- 대용량 데이터 환경에서 느린 쿼리의 원인인 'Full Table Scan'을 실제 DB(MySQL) 환경에서 재현하고 분석함.
- MySQL `EXPLAIN`을 통해 쿼리의 '실행 계획'을 분석하고, `type`, `Extra` 필드의 의미를 이해함.
- 데이터베이스 인덱스(Index)의 원리를 이해하고, 적용을 통해 쿼리 실행 방식을 최적화하는 능력을 기름.
- JPA 사용 시 가장 흔한 성능 저하 원인인 N+1 문제의 발생 원인을 파악하고, Fetch Join을 통해 해결하는 능력을 기름.

## 📚 학습 목차

1.  **[문제 분석: Full Table Scan과 `EXPLAIN`](#1-문제-분석-full-table-scan과-explain)**
2.  **[해결책 1: 인덱스(Index)](#2-해결책-1-인덱스index)**
3.  **[해결책 2: 커버링 인덱스(Covering Index)](#3-해결책-2-커버링-인덱스covering-index)**
4.  **[보너스: N+1 문제와 Fetch Join](#4-보너스-n1-문제와-fetch-join)**

---

## 🚀 핵심 학습 내용

### 1. 문제 분석: Full Table Scan과 `EXPLAIN`

- **문제 상황**: 인덱스가 없는 컬럼을 조회(`WHERE`) 시, DB가 테이블의 모든 데이터를 처음부터 끝까지 스캔하는 **Full Table Scan**이 발생하여 성능이 저하됨.
- **분석 도구**: MySQL `EXPLAIN` 명령어는 DB가 쿼리를 어떻게 실행할지 알려주는 '설계도'와 같음.
    - **`type: ALL`**: Full Table Scan이 발생했음을 의미하는 최악의 신호.

### 2. 해결책 1: 인덱스(Index)

- **정의**: 특정 컬럼의 데이터를 미리 정렬하여 보관하는 '색인'. DB가 원하는 데이터를 빠르게 찾도록 도와줌.
- **결과**: `EXPLAIN` 결과에서 `type`이 `ref`로 변경. 인덱스를 사용해 효율적으로 데이터를 찾았음을 의미.
- **주의점 (DB 캐싱)**: DB는 한 번 읽은 데이터를 메모리(**버퍼 풀**)에 캐싱함. 이로 인해 작은 데이터셋에서는 인덱스 유무에 따른 체감 속도 차이가 적을 수 있으므로, 단순 시간 측정보다 **실행 계획을 신뢰**해야 함.

### 3. 해결책 2: 커버링 인덱스(Covering Index)

- **정의**: `SELECT` 절에서 요구하는 모든 데이터가 인덱스 안에 포함되어, 실제 테이블에 접근할 필요조차 없는 가장 빠른 인덱스.
- **확인**: `EXPLAIN` 결과 `Extra` 필드에 **`Using index`**로 표시됨.

### 4. 보너스: N+1 문제와 Fetch Join

- **문제 상황**: 연관 관계가 있는 엔티티 조회 시, 첫 쿼리(1) 이후 연관된 엔티티를 조회하기 위해 N개의 추가 쿼리가 발생하는 현상.
- **해결책**: JPQL의 **`JOIN FETCH`** 문법을 사용하여, 단 하나의 `JOIN` 쿼리로 모든 연관 데이터를 한 번에 가져와 N개의 추가 쿼리를 방지.

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