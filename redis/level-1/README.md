# Redis 학습 - Level 1: 기본 개념 및 명령어

## 1. 핵심 개념 정리
- **In-Memory Data Store**: Redis는 모든 데이터를 RAM에 저장하여 디스크 기반 DB보다 압도적으로 빠른 속도를 자랑한다.
- **Key-Value 모델**: 모든 데이터는 '이름표(Key)'와 '내용물(Value)'의 쌍으로 저장된다.
- **Expiration**: 데이터에 '유통기한'을 설정할 수 있어, 캐시(Cache)로 활용하기에 매우 적합하다.

## 2. 실습 기록

### docker-compose.yml 파일 내용
Redis 서버를 컨테이너로 실행하기 위한 설계도.
```yaml
services:
  my-redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```
### SET mykey "Hello Redis"
> **의미**: 'mykey'라는 이름표(Key)에 'Hello Redis'라는 내용물(Value)을 저장한다.
```bash
OK
```

### GET mykey
> **의미**: 'mykey'라는 이름표(Key)에 저장된 내용물(Value)을 꺼내본다.
```bash
"Hello Redis"
```

### EXPIRE mykey 10
> **의미**: 'mykey'라는 이름표(Key)에 저장된 내용물(Value)의 유통기한을 10초로 설정한다.
```bash
(integer) 1
```

### TTL mykey
> **의미**: 'mykey'라는 이름표(Key)에 저장된 내용물(Value)의 남은 유통기한을 초 단위로 확인한다.
```bash
(integer) 10
```

### GET mykey (10초 후)
> **의미**: 'mykey'라는 이름표(Key)에 저장된 내용물(Value)의 유통기한이 만료된 후 꺼내본다.
```bash
(nil)
``` 