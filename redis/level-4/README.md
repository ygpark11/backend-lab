# Redis 학습 - Level 4: 고가용성 (Sentinel)

## 1. 핵심 개념 정리
- **고가용성(High Availability)**: 시스템에 장애가 발생해도, 중단 없이 서비스를 계속 제공하는 능력.
- **Redis Sentinel**: Master-Slave 구조를 감시하여, Master 장애 시 자동으로 Slave를 새로운 Master로 승격시키는 '감시자'이자 '매니저'.
- **장애 복구(Failover)**: Master가 다운되었을 때, Sentinel이 개입하여 새로운 Master를 선출하고 시스템을 정상화하는 전 과정.

## 2. 실습 기록: Sentinel 장애 복구 테스트

### 2-1. 정상 상태
`docker-compose up -d`로 Master 1대, Slave 2대, Sentinel 1대를 실행했다. Sentinel 로그를 통해 Master와 Slave를 정상적으로 감시하고 있음을 확인했다.
```
+monitor master mymaster [IP 주소] 6379 quorum 1
+slave slave ...
```

### 2-2. 장애 발생
`docker stop [master_container_name]` 명령어로 Master 컨테이너를 강제로 중지시켰다.

### 2-3. 장애 감지 및 복구
Sentinel 로그를 통해 아래와 같은 장애 복구 과정 전체를 실시간으로 확인했다.
1.  **`+sdown` / `+odown`**: Master가 다운되었음을 주관적/객관적으로 인지.
2.  **`+try-failover`**: 장애 복구 절차 시작.
3.  **`+selected-slave`**: 살아남은 Slave 중 하나를 새로운 Master 후보로 간택.
4.  **`+promoted-slave`**: 선택된 Slave가 새로운 Master로 승격됨.
5.  **`+switch-master`**: 시스템의 Master를 공식적으로 새로운 서버로 교체 선언.
6.  **`+slave-reconf-sent`**: 남아있는 다른 Slave에게 새로운 Master를 따르도록 재설정 명령 전송.

### 2-4. 최종 확인
새로운 Master로 승격된 컨테이너에 접속하여 `INFO replication` 명령어를 실행, `role:master`로 변경되었음을 최종 확인했다.

## 3. 학습한 내용
이번 실습을 통해 Docker Compose 환경에서 발생하는 복잡한 네트워크 타이밍 문제를 `entrypoint.sh` 스크립트로 해결하는 방법을 배웠고, Redis Sentinel의 실제 장애 복구 과정을 눈으로 확인하며 고가용성의 원리를 체득했다.