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