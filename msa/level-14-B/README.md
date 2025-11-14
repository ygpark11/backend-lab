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

