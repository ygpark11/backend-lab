# Docker 학습 - Level 1: 기본 개념 및 명령어

## 1. 핵심 개념 정리
- **이미지(Image) vs 컨테이너(Container)**: '붕어빵 틀'과 '붕어빵'의 관계.
    - **이미지**: 애플리케이션 실행에 필요한 모든 것을 담은, 변하지 않는 '설계도'.
    - **컨테이너**: 그 '설계도'를 바탕으로 실제로 실행한 '인스턴스'. 하나의 이미지로 여러 컨테이너를 만들 수 있다.
- **가상 머신(VM) vs 컨테이너**: 컨테이너는 OS를 공유하므로 VM('독채 주택')보다 훨씬 가볍고 빠르다. 컨테이너는 잘 지어진 '아파트'에 효율적으로 방 하나만 빌려 쓰는 것과 같다.


---
## 2. 언제 사용할까? & 대안 기술은?

### ✅ 이럴 때 사용하면 최고다
- **"제 컴퓨터에서는 잘 됐는데..."** 라는 환경 불일치 문제를 근본적으로 해결하고 싶을 때.
- 새로운 팀원의 개발 환경 세팅 시간을 1분으로 단축하고 싶을 때.
- 내 PC를 깔끔하게 유지하며 다양한 기술을 테스트하고 싶을 때.

### ↔️ 대안 기술
- **가상 머신(VM)**: 완전히 다른 OS(예: Windows에서 Linux)를 실행해야 할 때 유용하지만, 무겁고 느리다.
- **직접 설치**: 간단하지만, 프로그램 버전 충돌이나 설정 꼬임 문제가 발생하기 쉽다.

---
## 3. 실습 기록 및 해설

### 3-1. `docker pull hello-world`
> **해설**: 인터넷 '도커 허브'에서 'hello-world' 이미지(붕어빵 틀)를 내 컴퓨터로 다운로드한다.

```bash
Using default tag: latest
latest: Pulling from library/hello-world
...
Status: Downloaded newer image for hello-world:latest
```

### 3-2. `docker run hello-world`
> **해설**: 다운로드한 'hello-world' 이미지(틀)를 바탕으로 컨테이너(붕어빵)를 실행한다.

```bash
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

### 3-3. `docker images`
> **해설**: 내 컴퓨터에 다운로드된 모든 도커 이미지(붕어빵 틀) 목록을 보여준다.

```bash
REPOSITORY       TAG            IMAGE ID       CREATED        SIZE
hello-world      latest         1b44b5a3e06a   2 weeks ago    10.1kB
```

### 3-4. `docker ps -a`
> **해설**: 실행되었던 모든 도커 컨테이너(붕어빵) 목록을 보여준다. `-a` 옵션은 종료된 컨테이너까지 모두 포함하라는 의미다.

```bash
CONTAINER ID   IMAGE          COMMAND    CREATED         STATUS                     PORTS     NAMES
71ae5d9a3af6   hello-world    "/hello"   2 minutes ago   Exited (0) 2 minutes ago             tender_kepler
```

## 4. 핵심 Q&A

#### Q: `docker run redis` 명령어를 세 번 실행하면, 이미지와 컨테이너는 각각 몇 개인가?

- **A: `redis ` 이미지는 1개, 컨테이너는 3개이다.** 
  - 이미지는 '틀'이라 한 번만 필요하고, 컨테이너는 '붕어빵'이라 실행할 때마다 새로 만들어지기 때문이다.

## 5. 학습한 내용
- 이번 학습을 통해 도커의 가장 핵심적인 구성 요소인 **이미지**와 **컨테이너**의 관계를 '붕어빵 비유'를 통해 명확히 이해했다.
- `pull`, `run`, `images`, `ps`와 같은 기본 명령어를 사용하여 도커의 생명주기를 직접 체험했다.
- 도커가 왜 현대 개발 환경의 필수 기술이 되었는지, 그 **'존재 이유(환경 격리 및 통일)'**를 파악했다.