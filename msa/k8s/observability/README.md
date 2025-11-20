# 📝 [Level 15] 함대 관제 시스템 Phase 1: Monitoring (Prometheus & Grafana)

* **주제:** K8s 클러스터 리소스 관제 (Metrics)

---

## 1. 학습 목표 & 설계 철학 (Philosophy)
* **목표:** "보이지 않는 것을 보이게 하라." (7척 함대와 노드의 상태를 시각화)
* **적정 기술 (Reasonable Choice):**
    * **PLG Stack (Prometheus, Loki, Grafana):** 무거운 ELK(Elasticsearch) 대신, 로컬 Minikube 환경과 K8s에 최적화된 경량화 스택 선택.
    * **Native Manifest:** Helm의 마법에 의존하지 않고, 직접 YAML을 작성하여 동작 원리(RBAC, ConfigMap)를 파악함.

## 2. 아키텍처 (Architecture)
> "감시탑(Prometheus)이 망원경으로 엔진룸(Node)과 선원(Pod)을 관찰하고, 그 결과를 지휘 통제실(Grafana) 화면에 띄운다."

### Prometheus (The Eye)
* **방식:** Pull 방식 (주기적으로 타겟에 접속해 데이터를 긁어옴).
* **타겟:** `Node(Kubelet)`, `cAdvisor(Container Resource)`, `Self`.

### Grafana (The Face)
* **방식:** Prometheus를 데이터 소스로 연결하여 시각화.
* **특징:** `Provisioning` 설정을 통해 기동과 동시에 Prometheus와 자동 연결.

## 3. 핵심 구현 내용 (Key Implementation)
① 사전 준비: 엔진 확장 (Infra)

관제 시스템은 리소스를 많이 사용하므로 Minikube 메모리 증설이 필수적임. (OOMKilled 방지)

```bash
# 기존 4GB -> 7GB 이상으로 증설 (PC 사양에 따라 조절)
# 주의: WSL2 사용 시 .wslconfig 파일로 10GB 이상 확보 후 실행
minikube start --driver=docker --cpus 4 --memory 7168 --force
eval $(minikube docker-env) # Docker 데몬 재연결 필수
```

② 감시탑의 신분증: RBAC (Permission)

Prometheus가 K8s API를 통해 노드 정보를 열람하려면 **'권한(ClusterRole)'**이 필요함.

- 문제 상황: 초기 설정 시 노드 메트릭 접근 시 `403 Forbidden` 에러 발생.

- 해결: `nodes/metrics` 리소스에 대한 조회 권한 추가.

```yaml
# rbac.yaml (핵심)
rules:
  - apiGroups: [""]
    resources:
      - nodes
      - nodes/metrics  # ★ 이 줄이 없으면 403 에러 발생
      - pods
      - services
    verbs: ["get", "list", "watch"]
```

③ 서비스 디스커버리: ConfigMap (Configuration)

IP를 하드코딩하지 않고, K8s에게 물어봐서 동적으로 타겟을 찾음.

```yaml
# configmap.yaml (prometheus.yml)
scrape_configs:
  - job_name: 'kubernetes-cadvisor'
    kubernetes_sd_configs:
      - role: node  # 노드를 찾아서 그 안의 컨테이너 정보(cAdvisor) 수집
    scheme: https
    tls_config:
      insecure_skip_verify: true # 사설 인증서 허용
```

④ 지휘소 자동화: Datasource Provisioning

Grafana가 뜰 때 Prometheus 주소를 자동으로 인식하게 함. (IaC)

```yaml
# grafana-config.yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090 # K8s 내부 DNS 사용 (IP 불필요)
    isDefault: true
```

## 4. 트러블슈팅 & 학습 노트 (Troubleshooting Log)
- Issue 1: Minikube 메모리 부족

  - 증상: 파드가 뜨다가 `CrashLoopBackOff` 또는 `OOMKilled`.

  - 해결: WSL2 메모리 제한 해제(`.wslconfig`) 후 Minikube 메모리 7GB 할당.

- Issue 2: Prometheus Target 403 에러

  - 증상: 타겟 목록에서 `kubernetes-nodes`가 `DOWN` 상태, 에러 메시지는 Forbidden.

  - 해결: ServiceAccount에 `nodes/metrics` 권한 부여 (`ClusterRole` 수정).

- Issue 3: Grafana "No Data"

  - 증상: 대시보드 임포트(ID: 14282, 315) 후 데이터가 안 뜸.

  - 원인 1 (시간): 데이터 수집 시간이 짧아 `Last 6 hours`에서 안 보임 -> `Last 5 minutes`로 변경.

  - 원인 2 (부하): 현재 배포된 애플리케이션 파드가 없어 CPU 사용량이 0에 수렴함.

  - 검증: `Grafana Explore` 탭에서 `container_memory_usage_bytes` 쿼리 실행 시 정상 데이터 수신 확인됨.

## 5. 실행 방법 (How to Run)
```bash
# 1. 메트릭 수집기 배포
kubectl apply -f k8s/observability/prometheus

# 2. 시각화 도구 배포
kubectl apply -f k8s/observability/grafana

# 3. 웹 접속 확인
minikube service prometheus # 데이터 수집 확인 (Status -> Targets)
minikube service grafana    # 대시보드 확인 (ID/PW: admin)
```