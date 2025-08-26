# Docker 학습 - Level 1: 기본 개념 및 명령어

## 1. 핵심 개념 정리

- **이미지(Image)**: '붕어빵 틀'. 애플리케이션 실행에 필요한 모든 것을 담은 설계도.
- **컨테이너(Container)**: '붕어빵'. 이미지를 바탕으로 실제로 실행된 인스턴스.

## 2. 기본 명령어 실행 기록

### docker pull hello-world
> **의미**: 인터넷 '도커 허브'에서 'hello-world' 이미지(붕어빵 틀)를 내 컴퓨터로 다운로드한다.

```bash
Using default tag: latest
latest: Pulling from library/hello-world
17eec7bbc9d7: Pull complete
Digest: sha256:a0dfb02aac212703bfcb339d77d47ec32c8706ff250850ecc0e19c8737b18567
Status: Downloaded newer image for hello-world:latest
docker.io/library/hello-world:latest
```

### docker run hello-world
> **의미**: 다운로드한 'hello-world' 이미지(붕어빵 틀)를 바탕으로 실제로 'hello-world' 컨테이너(붕어빵)를 실행한다.
```bash
Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

### docker images
> **의미**: 내 컴퓨터에 다운로드된 도커 이미지(붕어빵 틀) 목록을 보여준다.
```bash
REPOSITORY       TAG            IMAGE ID       CREATED        SIZE
hello-world      latest         1b44b5a3e06a   2 weeks ago    10.1kB
apache/airflow   3.0.2          5318b994dce4   2 months ago   1.85GB
redis            7.2-bookworm   7988f6026cdb   2 months ago   117MB
postgres         13             70c2042f6fda   3 months ago   423MB
apache/airflow   3.0.1          4b469478ec14   3 months ago   1.8GB
hello-world      <none>         74cc54e27dc4   7 months ago   10.1kB
```

### docker ps -a
> **의미**: 내 컴퓨터에서 실행 중이거나 종료된 모든 도커 컨테이너(붕어빵) 목록을 보여준다.
```bash
CONTAINER ID   IMAGE          COMMAND    CREATED         STATUS                     PORTS     NAMES
71ae5d9a3af6   hello-world    "/hello"   2 minutes ago   Exited (0) 2 minutes ago             tender_kepler
e5b0a0c5fda0   74cc54e27dc4   "/hello"   2 months ago    Exited (0) 2 months ago              eager_mclaren
53ab50077399   74cc54e27dc4   "/hello"   2 months ago    Exited (0) 2 months ago              zen_swartz
88249f0dbca1   74cc54e27dc4   "/hello"   2 months ago    Exited (0) 2 months ago              zen_sinoussi
```