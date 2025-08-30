# Redis 학습 - Level 2: 다양한 자료구조 활용하기

## 1. 핵심 개념 정리
Redis의 진짜 힘은 단순한 Key-Value를 넘어, 특정 목적에 최적화된 자료구조에서 나온다.

- **Lists**: '타임라인'이나 '대기열'처럼 순서가 중요하고 중복을 허용하는 데이터를 저장한다.
- **Hashes**: 여러 필드와 값으로 구성된 '객체' 데이터를 하나의 키에 저장하기에 완벽하다.
- **Sets**: 순서 없이 '고유한 값'만 저장하는 '주머니'와 같다. 태그나 좋아요 목록에 적합하다.
- **Sorted Sets**: '스코어(Score)'를 기준으로 정렬되는 고유값 집합. '실시간 랭킹' 구현의 필살기다.

## 2. 실습 기록
`docker exec -it [컨테이너_이름] redis-cli` 명령어로 컨테이너에 접속하여 아래 명령어들을 실습했다.

### Hashes
> `user:1` 이라는 키 하나에 이름과 이메일이라는 여러 필드를 함께 저장하고 조회했다.

```redis
# user:1 키에 name과 email 필드 저장
127.0.0.1:6379> HSET user:1 name "John Doe" email "john@example.com"
(integer) 2

# user:1의 모든 필드와 값 조회
127.0.0.1:6379> HGETALL user:1
1) "name"
2) "John Doe"
3) "email"
4) "john@example.com"
```

### Sorted Sets
> `game_ranking` 이라는 Sorted Set에 3명의 유저와 점수를 등록하고, 점수 순으로 랭킹을 조회했다.
```redis
127.0.0.1:6379> ZADD game_ranking 1500 user_a
(integer) 1
127.0.0.1:6379> ZADD game_ranking 3000 user_b
(integer) 1
127.0.0.1:6379> ZADD game_ranking 2100 user_c
(integer) 1
```
> 점수 순으로 랭킹 조회 (높은 점수부터 낮은 점수까지)
```redis
127.0.0.1:6379> ZREVRANGE game_ranking 0 -1 WITHSCORES
1) "user_b"
2) "3000"
3) "user_c"
4) "2100"
5) "user_a"
6) "1500"
```

### Sets
> `post:1:tags` 라는 Set에 여러 태그를 추가
```redis
# post:1:tags 라는 주머니에 태그 추가
127.0.0.1:6379> SADD post:1:tags "redis" "docker" "java"
(integer) 3
```

> 주머니에 담긴 모든 태그 조회
```redis
127.0.0.1:6379> SMEMBERS post:1:tags
1) "redis"
2) "java"
3) "docker"
```

### Lists
> `tasks` 라는 List에 여러 작업을 순서대로 추가
```redis
127.0.0.1:6379> RPUSH tasks "Task A" "Task B" "Task C"
(integer) 3
```
> 대기줄 왼쪽에서 가장 먼저 들어온 작업 꺼내기
```redis
127.0.0.1:6379> LPOP tasks
"Task A"
```
> 현재 남은 작업 목록 확인
```redis
127.0.0.1:6379> LRANGE tasks 0 -1
1) "Task B"
2) "Task C"
```

---

## 3. 자료구조 선택 가이드 (언제 무엇을 쓸까?)

| 이런 문제를 만났을 때 | 추천 자료구조 | 대표 명령어 |
| :--- | :--- | :--- |
| 객체(사용자 정보 등)를 통째로 저장하고 싶을 때 | **Hashes** | `HSET`, `HGETALL` |
| 실시간 랭킹보드가 필요할 때 | **Sorted Sets** | `ZADD`, `ZREVRANGE`|
| 중복 없이 고유한 값(태그, 좋아요 사용자)만 모으고 싶을 때 | **Sets** | `SADD`, `SMEMBERS` |
| 데이터가 들어온 순서가 중요할 때 (대기열, 최근 본 상품) | **Lists** | `RPUSH`, `LPOP` |
| 단순한 값(카운터, 캐시)을 저장하고 싶을 때 | **Strings** | `SET`, `GET`, `INCR` |