# Docker 학습 - Level 3: Docker Compose

## 1. 핵심 개념 정리
- **Docker Compose**: 여러 개의 컨테이너를 하나의 `docker-compose.yml` 파일로 정의하고 관리하는 도구.
- **`docker-compose.yml`**: 컨테이너 마을의 '건축 설계 총괄도'. 이 파일 하나로 모든 서비스(컨테이너)의 구성과 네트워크를 관리한다.

## 2. Docker Compose 명령어 실행 기록

### docker-compose.yml 파일 내용
```yaml
version: '3.8'

services:
  my-app:
    build: ../level-2
    ports:
      - "8080:8080"
    depends_on:
      - my-redis
  
  my-redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### docker-compose up -d
> **의미**: `docker-compose.yml` 파일에 정의된 모든 서비스를 백그라운드에서 실행한다.
```bash
WARN[0000] /mnt/c/Users/Yonggyu/Desktop/study/docker-study/docker/level-3/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion 
[+] Running 3/3
 ✔ Network level-3_default       Created                                                                                                                                                                                         0.0s 
 ✔ Container level-3-my-redis-1  Started                                                                                                                                                                                         0.2s 
 ✔ Container level-3-my-app-1    Started                  
```

### docker ps
> **의미**: 현재 실행 중인 도커 컨테이너(붕어빵) 목록을 보여준다.
```bash
CONTAINER ID   IMAGE            COMMAND                  CREATED              STATUS              PORTS                                         NAMES
8803ac8f35fc   level-3-my-app   "java -jar /app.jar"     About a minute ago   Up About a minute   0.0.0.0:8080->8080/tcp, [::]:8080->8080/tcp   level-3-my-app-1
957e3d4f2d14   redis:alpine     "docker-entrypoint.s…"   About a minute ago   Up About a minute   0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp   level-3-my-redis-1
```

### docker-compose down
> **의미**: `docker-compose.yml` 파일에 정의된 모든 서비스를 중지하고 네트워크를 제거한다.
```bash
WARN[0000] /mnt/c/Users/Yonggyu/Desktop/study/docker-study/docker/level-3/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion 
[+] Running 3/3
 ✔ Container level-3-my-app-1    Removed                                                                                                                                                                                         0.3s 
 ✔ Container level-3-my-redis-1  Removed                                                                                                                                                                                         0.4s 
 ✔ Network level-3_default       Removed            
```