# 🌊 Level 14-B: 궁극의 배포 (Kubernetes 기초)

우리는 Level 14-A의 Docker Compose를 넘어, '운영 환경의 표준'인 Kubernetes(K8s)의 세계에 첫발을 내디뎠다.
로컬 PC(WSL + Docker Engine) 환경에 '미니 K8s 클러스터'를 성공적으로 구축하고, K8s의 3대 핵심 개념 중 가장 중요한 `Pod`와 `Deployment`를 마스터했다.

## 1. 학습 목표: '총사령관' K8s 만나기

- K8s가 왜 필요한지 이해한다. (Compose vs. K8s)
- 로컬 K8s 환경을 구축한다. (`kubectl`, `minikube`)
- K8s의 '원자'인 `Pod`를 '선언형(YAML)'으로 배포한다.
- K8s의 '관리자'인 `Deployment`를 '선언형(YAML)'으로 배포한다.
- `Deployment`가 제공하는 '자가 치유(Self-healing)'의 힘을 직접 목격한다.

## 2. K8s 핵심 개념 비교: `Pod` vs `Deployment`

'선장'은 '함선(`Pod`)'을 직접 관리하지 않고, '함선 관리자(`Deployment`)'에게 '설계도(YAML)'를 하달한다.

| 개념 | `kind: Pod` (함선) | `kind: Deployment` (함선 관리자) |
| --- | --- | --- |
| **역할** | K8s 배포의 가장 작은 단위. (컨테이너 그룹) | `Pod`의 상태와 개수를 '관리'하고 '유지'. |
| **설계도** | `pod-nginx.yml` | `deployment-nginx.yml` (내부에 `Pod`의 `template`을 품고 있음) |
| **명령** | `kubectl apply -f pod-nginx.yml` | `kubectl apply -f deployment-nginx.yml` |
| **핵심** | "이 Pod를 **'생성(Create)'**하라." (1회성) | "이 Pod가 **'N개 유지(Maintain)'**되도록 하라." (지속적) |
| **자가 치유** | **X (없음)** <br> Pod 삭제 시, 복구되지 않음. | **O (있음)** <br> `replicas` 수보다 Pod가 적으면, 즉시 Pod를 **'자동 복구'**함. |

## 3. 로컬 K8s 환경 구축 (WSL + minikube)

우리는 'Docker Desktop'이 아닌, WSL(Linux) 내장 'Docker Engine' 환경에서 K8s를 구축했다.

1.  **조종실 설치 (`kubectl`):** K8s 사령부에 명령을 내리는 CLI 도구.
    ```bash
    # 다운로드
    curl -LO "[https://dl.k8s.io/release/$(curl](https://dl.k8s.io/release/$(curl) -L -s [https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl](https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl)"
    # 실행 권한 및 이동
    chmod +x ./kubectl
    mv ./kubectl /usr/local/bin/kubectl
    # 검증
    kubectl version --client
    ```

2.  **사령부 설치 (`minikube`):** 로컬 PC에 '미니 K8s 클러스터'를 생성하는 도구.
    ```bash
    # 다운로드
    curl -LO "[https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64](https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64)"
    # 설치 (이동 + 권한)
    install minikube-linux-amd64 /usr/local/bin/minikube
    # 검증
    minikube version
    ```

3.  **사령부 구축 (`minikube start`):**
    `root` 사용자로 WSL Docker Engine을 사용하기 위해 `--force` 옵션 사용.
    ```bash
    minikube start --driver=docker --force
    ```

4.  **최종 검증:**
    ```bash
    kubectl get nodes
    # NAME       STATUS   ROLES           AGE     VERSION
    # minikube   Ready    control-plane   ...     v1.34.0
    ```

## 4. '선장의 방식' 핵심 코드 (YAML)

### `pod-nginx.yml` (자가 치유 X)

```yaml
# k8s/pod-nginx.yml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod-declarative
spec:
  containers:
  - name: nginx-container
    image: nginx:latest
```

- 실험: kubectl delete pod nginx-pod-declarative -> 복구 안 됨.

### `deployment-nginx.yml` (자가 치유 O)

```yaml
# k8s/deployment-nginx.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1             # (★) 약속: "항상 1개를 유지한다."
  selector:
    matchLabels:
      app: nginx-app
  template:                 # (★) 'Pod'의 설계도를 품고 있다.
    metadata:
      labels:
        app: nginx-app    # (★) selector가 이 Pod를 찾기 위한 꼬리표
    spec:
      containers:
        - name: nginx-container
          image: nginx:latest
```

- 실험: kubectl get pods로 nginx-deployment-xxxx 이름 확인 후, kubectl delete pod [이름] -> 즉시 새로운 Pod가 생성되며 복구됨.

## 5. 핵심 `kubectl` 명령어

```bash
# [환경] 사령부(K8s 클러스터) 상태 확인
kubectl get nodes

# [적용] '선언형'으로 설계도(YAML)를 제출/갱신
kubectl apply -f [파일명].yml

# [조회] 현재 떠 있는 자원 목록 확인
kubectl get pods
kubectl get deployment

# [삭제] 자원을 강제로 삭제
kubectl delete pod [Pod이름]
kubectl delete deployment [Deployment이름]

# [모니터링] 1초마다 실시간으로 상황실 모니터링
watch kubectl get pods
```

---

## 🌊 Level 14-C (Part 1): '항구의 내부 교환원' (Service - ClusterIP)

Level 14-B에서 `Deployment`를 통해 '자가 치유'되는 함대(Pod)를 만들었다.
하지만 '총사령관'이 `Pod`를 '자가 치유'시킬 때마다 `Pod`의 IP 주소가 계속 바뀌는 '유령 함대' 문제가 발생했다. 이래서는 `api-gateway` 같은 다른 서비스가 `nginx`를 안정적으로 찾아갈 수 없다.

이 '내부 통신' 문제를 해결하기 위해, K8s 3대 핵심 개념의 마지막 퍼즐인 **`Service`**를 도입한다.

### 1. '왜?' (Service가 필요한 이유)

`Service`는 K8s 항구 내부에 설치하는 **'내부 교환원'**이다.

- **문제점:** `Deployment`가 `Pod`를 복구(재생성)할 때마다, `Pod`는 **'임시 IP'** (예: `172.17.0.5`)를 새로 할당받는다. 이 IP는 신뢰할 수 없다.
- **해결책:** `Service`는 `Pod`들 앞에 **'고정된 대표 IP'** (예: `10.109.57.21`)와 **'고정된 DNS 이름'** (예: `nginx-service`)을 제공한다.
- **동작:** K8s 내의 다른 서비스(`api-gateway`)는 `Pod`의 '임시 IP'를 몰라도, 이 '교환원'의 '대표 IP/이름'으로만 요청을 보내면 된다. `Service`가 알아서 현재 살아있는 `Pod`에게 요청을 '연결'(프록시/로드 밸런싱)해준다.

### 2. '무엇을?' (Service 'ClusterIP' 실습)

항구 '내부용'으로만 작동하는 가장 기본 타입인 `ClusterIP` '교환원'을 설치했다.

**[k8s/service-nginx.yml]**
```yaml
# k8s/service-nginx.yml
# K8s 항구 내부에 '고정된 이름'과 '내부 IP'를 부여하는 'Service'를 정의합니다.

apiVersion: v1
kind: Service
metadata:
  name: nginx-service  # (★) 이 '서비스'의 고유한 이름 (e.g., http://nginx-service)
spec:
  type: ClusterIP    # (★) 유형: ClusterIP (항구 내부용)

  selector:            # (★) '어떤 Pod'들에게 연결할지 찾는 '꼬리표'
    app: nginx-app   # (필수!) deployment-nginx.yml의 'labels.app' 값과 일치해야 함

  ports:
  - protocol: TCP
    port: 80         # (★) 이 '서비스(nginx-service)'가 '80'번 포트로 전화를 받음
    targetPort: 80   # (★) 전화를 'Pod'의 '80'번 포트로 연결함
```

- 실행: `kubectl apply -f service-nginx.yml`

- 검증: `kubectl get service` (또는 `kubectl get svc`)

- 결과: `nginx-service`가 `CLUSTER-IP` (예: `10.109.57.21`)를 할당받은 것을 확인했다.

- 돌발상황: `minikube`가 꺼져있어서 `connection refused` 오류 발생. `minikube start --driver=docker --force`로 '사령부'를 재시작하여 해결함.

### 3. '핵심 Q&A' (덜컥거림 없는 이해)

Q: 'Pod'가 '고정 IP'를 할당받는 것인가?

A: 아니다! (가장 중요)

- `Pod`는 '자가 치유'될 때마다 '계속 다른 임시 IP' (예: `172.17.0.5`)를 받는다. (`kubectl get pods -o wide`로 확인 가능)

- 'Service' (교환원)가 '영원히 바뀌지 않는 고정 IP' (예: `10.109.57.21`)를 받는다.

- 'Service'는 이 '고정 IP'로 요청을 받아서, '임시 IP'를 가진 `Pod`에게 '대신 연결'(프록시)해주는 것이다.

Q: 'Service'는 '유레카 서버'와 같은 것인가?

A: 95% 맞다. (훌륭한 비유!) '같은 문제'(서비스 디스커버리)를 해결하지만, '방식'이 다르다.

- 유레카 (Level 13): '전화번호부'.

  - `api-gateway`가 유레카에게 "nginx IP 줘"라고 '묻는다'.

  - 유레카는 "저기 `172.17.0.5`야"라고 '알려준다'.

  - `api-gateway`가 직접 `172.17.0.5`로 전화한다.

- K8s Service (Level 14): '교환원'.

  - `api-gateway`가 Service의 '대표번호'(`10.109.57.21`)로 "nginx 연결해줘"라고 '요청한다'.

  - `Service`가 "알겠다"고 한 뒤, 자신이 대신 `172.17.0.5`로 전화를 '연결해준다'(프록시).

  - `api-gateway`는 `nginx`의 실제 '임시 IP'를 전혀 몰라도 된다.

### 4. '항구의 관문' 개방 (Service - NodePort)

`ClusterIP`는 '내부 통신' 문제는 해결했지만, '외부 세계'(내 PC의 WSL 터미널)에서는 여전히 '고립된 항구'에 접속할 수 없는 문제가 남았다.

'항구의 관문'을 열기 위해 `Service`의 타입을 `NodePort`로 '업그레이드'했다.

- **`NodePort`란?** `ClusterIP`의 모든 기능(내부 교환원)을 '포함'하면서, '항구의 벽'(Node)에 '외부 관문'(랜덤 포트, 30000~32767)을 추가로 개방하는 타입.

**[k8s/service-nginx.yml (최종 수정본)]**
```yaml
# k8s/service-nginx.yml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: NodePort    # (★) 'ClusterIP'에서 'NodePort'로 수정 (승격)
  selector:
    app: nginx-app
  ports:
  - protocol: TCP
    port: 80         # (내부 교환원 포트)
    targetPort: 80   # (Pod 포트)
    # 'nodePort: 31795' (← 이 부분은 K8s가 자동으로 할당/기록함)
```

### 5. '항구의 관문' 개방 (Service - NodePort)

`NodePort`를 통해 '항구 밖'에서 `nginx`에 접속하는 것을 최종 확인했다.

1. 설계도 수정 적용: `kubectl apply -f service-nginx.yml`

   - `service "nginx-service" configured` 메시지 확인.

2. '관문' 포트 확인: `kubectl get svc nginx-service`

   - `TYPE`이 `NodePort`로 변경됨.

   - `PORT(S)`가 `80:31795/TCP` (예시)처럼, '내부 포트(80)'와 '외부 관문 포트(31795)'가 매핑된 것을 확인.

3. '항구 주소'(Node IP) 확인: `minikube ip`

   - `192.168.49.2` (예시)와 같은 '항구'의 IP를 확인.

4. '외부'에서 '관문'으로 접속 (최종 성공): `curl http://[minikube-ip]:[nodeport]`

   - `curl http://192.168.49.2:31795` (예시)

   - `Welcome to nginx!` HTML이 터미널에 성공적으로 출력됨.

---

## 🌊 Level 14-D: '7척의 MSA 함대' K8s 진수 (최종 보스)

Level 14-C까지 배운 '연습용 함선'(`nginx`)을 넘어, 우리가 직접 건조한 '7척의 MSA 함대'를 K8s에 배포하는 대장정이다.

이 과정에서 '두 개의 거대한 장벽'을 만났다.
1.  **장벽 1: 이미지 인식 (ImagePullBackOff):** `minikube`는 '별도의 Docker Daemon'을 사용하므로, `eval $(minikube -p minikube docker-env)`로 '조선소'를 맞춰야 한다.
2.  **장벽 2: 서비스 디스커버리 (네트워킹):** `docker-compose`의 이름(`config-server`)이 아닌, K8s `Service`의 이름(`config-service`)을 사용하도록 '설정'을 변경해야 한다.

### 1. (Part 1) '선결 과제': '생명 유지 장치' 구축

'선봉함'인 `config-service`는 `RabbitMQ`와 `Zipkin`에 의존성이 있다. 따라서 `config-service`보다 '인프라' 2척을 K8s에 먼저 배포했다.

- '공식 이미지'(Docker Hub)를 사용했으므로, '장벽 1'(이미지 빌드)은 해당되지 않았다.

**[k8s/deployment-rabbitmq.yml]**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3-management
        ports:
        - containerPort: 5672
        - containerPort: 15672
```

**[k8s/service-rabbitmq.yml] (`ClusterIP`, 내부용)**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq-service # (★) config-service가 이 '이름'으로 찾아옴
spec:
  type: ClusterIP
  selector:
    app: rabbitmq
  ports:
  - name: amqp
    port: 5672
    targetPort: 5672
  - name: management-ui
    port: 15672
    targetPort: 15672
```

**[k8s/deployment-zipkin.yml]**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zipkin
  template:
    metadata:
      labels:
        app: zipkin
    spec:
      containers:
        - name: zipkin
          image: openzipkin/zipkin
          ports:
            - containerPort: 9411
```
**[k8s/service-zipkin.yml] (`NodePort`, 외부 UI 확인용)**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: zipkin-service # (★) 모든 서비스가 이 '이름'으로 추적 정보를 보냄
spec:
  type: NodePort
  selector:
    app: zipkin
  ports:
  - protocol: TCP
    port: 9411
    targetPort: 9411
    # nodePort: 32708 (K8s 자동 할당 예시)
```

### 2. '돌발 상황': '윈도우-WSL 장벽' (ERR_CONNECTION_TIMED_OUT)
`minikube ip`로 확인한 '항구 주소'(`192.168.49.2`)는 'WSL(섬) 내부용' 주소이다. '윈도우(대륙)'의 '웹 브라우저'에서 이 주소로 직접 접속할 수 없다.

- 해결책: '총사령관'의 '마법의 주문'(minikube service)을 사용했다.

- 명령: minikube service zipkin-service

- 결과: '총사령관'이 '임시 뱃길(터널)'을 뚫고, '윈도우'의 '웹 브라우저'를 '자동으로' 실행하여 Zipkin UI 접속에 성공했다.

- (학습 완료) rabbitmq-deployment와 zipkin-deployment가 Running 상태임을 kubectl get pods로 확인.

### 3. (Part 2) '선봉함' 진수 (Config Service)

'인프라'가 준비되고, '장벽 2'(서비스 디스커버리)를 해결하기 위해 '항해 지도'를 갱신했다.

- **(수정 1)** `config-service`의 'Bootstrap 설정'(`src/main/resources/application.yml`)의 `rabbitmq.host`를 `rabbitmq-service`로 수정했다.
- **(수정 2)** '중앙 항해 지도'(`backend-lab-config.git`의 `application.yml`)의 `rabbitmq.host`와 `zipkin.tracing.endpoint`를 `rabbitmq-service`와 `zipkin-service`로 '갱신'하고 `git push`했다.

'설계도'가 갱신되었으므로, '함선'을 '재건조'하고 '진수'를 시도했다.

### 4. '돌발 상황': '장벽 1' (ErrImageNeverPull)

- **현상:** `kubectl get pods` 결과, `config-service` Pod가 `ErrImageNeverPull` 상태로 '진수'에 실패했다.
- **원인:** '부산 조선소'(WSL)와 '인천 조선소'(Minikube)의 차이. '선봉함'을 '부산'(WSL)에 건조(`docker build`)해놓고, '총사령관'은 '인천'(`minikube`)에서 `imagePullPolicy: Never`로 이미지를 찾으려 했기 때문이다.
- **해결책 (항로 수정):**
    1.  **'조선소' 연결:** `eval $(minikube -p minikube docker-env)` '마법의 주문'으로 터미널이 '인천 조선소'(`minikube`)를 바라보게 했다.
    2.  **'인천'에서 재건조:** `config-service` 폴더에서 `docker build -t config-service:1.0 .`를 '다시' 실행하여, '총사령관'이 '인식할 수 있는' 위치에 함선을 건조했다.
    3.  **'진수' 재시도:** `k8s/` 폴더에서 `kubectl apply -f deployment-config.yml`과 `kubectl apply -f service-config.yml`을 '다시' 실행했다.

### 5. '선봉함' 진수 성공 (Level 14-D Part 2 완수)

- **(검증 1)** `kubectl get pods`: `config-service-deployment-...` Pod가 **`Running`** 상태가 되는 것을 확인.
- **(검증 2)** `kubectl get svc config-service`: '관문'(`NodePort`) 번호 확인 (예: `8888:30887/TCP`)
- **(검증 3)** `minikube ip`: '항구 주소' 확인 (예: `192.168.49.2`)
- **(최종 검증)** `curl http://192.168.49.2:30887/actuator/health`
    - **`{"status":"UP"}`** '생존 신호'를 '항구 외부'에서 수신 완료

### 6. (Part 3) '함대의 두뇌' (Eureka) 진수

'선봉함'(`config-service`)과 '인프라'가 '정박'된 '항구'에 '함대의 두뇌'(`discovery-service`)를 '진수'시켰다.

- **(장벽 1)** `eval $(minikube docker-env)`로 '인천 조선소'에 `discovery-service:1.0` '함선'을 '건조'했다.
- **(장벽 2)** `config-service`를 '먼저' 찾아야 하는 '닭과 달걀' 문제가 있었다.

### 7. '돌발 상황': 'CrashLoopBackOff' (최고 레벨의 '덜컥거림')

- **현상:** `discovery-service` Pod가 `Running` -> `Error` -> `CrashLoopBackOff` '무한 루프'에 빠졌다.
- **'블랙박스' 회수:** `kubectl logs [pod-name]`
- **'유언':** `java.lang.IllegalStateException: Unable to load config data from 'configserver:http://config-service:8888'`
- **'진짜' 원인:** `Caused by: IllegalStateException: Incorrect ConfigDataLocationResolver chosen...`

### 8. '사고'의 '최종 진단' 및 '수리' (엔지니어의 진단법)

'사고'의 원인은 '네트워킹'(`Connection refused`)이 '아니라', '엔진'(Spring)이 '마법 주문'(`configserver:`)을 '해석'할 '부품'(`Starter`)이 '누락'되었기 때문이었다.

- **(수리 1: 항해 지도)** 'Spring Boot 3'는 `bootstrap.yml`을 '읽지 않는다'.
    - `rm src/main/resources/bootstrap.yml` ('구형 지도' 폐기)
    - `application.yml`에 '열쇠'(`spring.config.import...`)와 '임무'(`eureka.client...`)를 '모두' '갱신'했다.
- **(수리 2: 엔진 부품)** 'Config Server 해석기' '부품'이 '누락'되었다.
    - `discovery-service`의 `build.gradle`의 `dependencies`에 `implementation 'org.springframework.cloud:spring-cloud-starter-config'`를 '추가'했다.
- **(수리 3: 함선 건조)** '선장'의 '자가 진단'(`*.jar` 충돌)을 통해 `jar { enabled = false }`도 `build.gradle`에 '추가'했다.

- **(재진수)** '수리된' `build.gradle`과 `application.yml`을 바탕으로 `docker build -t discovery-service:1.0 .`를 '인천 조선소'에 '재건조'했다.
- **(교체)** `kubectl delete pod [crash-pod-name]`로 '사고 함선'을 '강제 퇴역'시키자, '총사령관'(`Deployment`)이 '자동으로' '수리된 새 함선'을 '진수'시켰다.

### 9. '함대의 두뇌' 진수 성공 (Level 14-D Part 3 완수)

- **(검증 1)** `watch kubectl get pods`: `discovery-service-deployment-...` Pod가 **`Running`** 상태가 되는 것을 확인.
- **(최종 검증)** `minikube service discovery-service`
    - '총사령관'의 '터널링 마법'으로 **'유레카 대시보드' UI가 '웹 브라우저'에 '자동으로' 출력**되는 것을 확인

### 10. (Part 4) '후속 함대' 진수 (Gateway & Users) 및 최종 연결

'함대의 관문'(`api-gateway-service`)과 '비즈니스 함선'(`users-service`)을 K8s에 진수시키고, '외부'에서 '내부 깊은 곳'까지의 통신을 검증했다.

- **(속전속결)** `discovery-service` 때 학습한 '표준 건조 절차'(`build.gradle` 수정, `application.yml` 수정, `eval` 빌드)를 적용하여 빠르게 진수.

#### 🛠️ 트러블슈팅 (Troubleshooting)

**1. 장벽 3: 라우팅 불일치 (404 Not Found)**
- **현상:** `curl .../user-service/...` 호출 시 Gateway가 `404` 응답.
- **원인:** Gateway 설정은 `Path=/users/**` (복수형)인데, 요청을 단수형으로 보냄.
- **해결:** 요청 경로를 `/users/...`로 수정하여 호출.

**2. 장벽 4: 문지기의 검문 (400 Bad Request)**
- **현상:** Gateway 로그에 `GlobalFilter: X-Request-ID header is missing!` 에러 발생.
- **원인:** `curl` 요청에 필수 헤더가 누락됨.
- **해결:** `curl -H "X-Request-ID: test" ...` 헤더 추가.

**3. 장벽 5: 유령 주소 (500 Internal Server Error / UnknownHostException)**
- **현상:** Gateway 로그에 `Failed to resolve 'user-service-deployment-xxx'` 에러 발생.
- **원인:** `user-service`가 유레카에 자신의 'Pod Hostname'을 등록했으나, K8s 내부 DNS는 Pod 이름을 해석하지 못함.
- **해결:** `user-service`의 `application.yml`에 `eureka.instance.prefer-ip-address: true`를 추가. 유레카에 'IP 주소'를 등록하게 하여 DNS 조회를 우회함.

### 11. Level 14 최종 완수 선언 (Mission Complete)

- **최종 테스트:** `curl -H "X-Request-ID: test" http://[minikube-ip]:[NodePort]/users/actuator/health`
- **결과:** `{"status":"UP"}` 응답 확인.
- **의의:** 7척의 MSA 함대(Config, Discovery, Gateway, Infra, Services)가 모두 Kubernetes 클러스터 위에서 유기적으로 연결되어 동작함을 증명.
