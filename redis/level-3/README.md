# Redis 학습 - Level 3: 데이터 영속성 (Persistence)

## 1. 핵심 개념 정리
- **영속성(Persistence)**: In-Memory 데이터인 Redis의 내용을 디스크에 저장하여, 서버가 재시작되어도 데이터가 유실되지 않도록 만드는 기술.
- **RDB (Snapshotting)**: 특정 시점의 데이터 전체를 '사진' 찍듯이 파일로 저장. 복구 속도가 빠르지만, 마지막 스냅샷 이후의 데이터는 유실될 수 있다.
- **AOF (Append Only File)**: 모든 쓰기 명령어를 로그 파일에 '받아쓰기'처럼 순서대로 기록. 데이터 안정성이 매우 높지만, 복구 속도는 RDB보다 느릴 수 있다.
- **실무 표준**: 데이터 안정성을 위해 **AOF를 기본**으로 사용하고, RDB는 백업용으로 함께 사용하는 경우가 많다.

## 2. 실습 기록

### Docker Compose 설정 (`docker-compose.yml`)
AOF 영속성 모드를 활성화하고, 설정 파일과 데이터 폴더를 로컬 PC와 연결(volume mount)했다.

```yaml
services:
  my-redis-persistent:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf
      - ./data:/data
    command: redis-server /usr/local/etc/redis/redis.conf
```

### REDIS 설정 파일 (redis.conf)
AOF 설정을 활성화하고, 동기화 정책을 '매 쓰기마다'로 설정했다.

```conf
appendonly yes
appendfsync always
```

### 영속성 테스트 과정
1. docker-compose up -d로 컨테이너를 실행했다.

2. docker exec로 접속하여 SET my_persistent_key "This data will survive!" 명령어로 데이터를 저장했다.

3. 로컬 PC의 redis/level-3/data 폴더에 appendonly.aof 파일이 생성된 것을 확인했다.

4. docker-compose down으로 컨테이너를 완전히 삭제했다.

5. 다시 docker-compose up -d로 컨테이너를 실행했다.

6. 재접속하여 GET my_persistent_key를 실행하니, "This data will survive!" 데이터가 그대로 남아있는 것을 확인하여 영속성이 적용됨을 증명했다.