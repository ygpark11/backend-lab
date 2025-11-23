# [Level 15] 함대 관제 시스템 (Observability: Monitoring & Logging)

* **주제:** K8s 통합 관제 시스템 구축 (Metrics & Logs)

---

## 1. 학습 목표 & 설계 철학 (Philosophy)
* **목표:** "보이지 않는 것을 보이게 하라." (Metrics로 상태를 보고, Logs로 원인을 찾는다.)
* **적정 기술 (Reasonable Choice):**
    * **PLG Stack (Prometheus, Loki, Grafana):** 무거운 ELK(Elasticsearch) 대신, 로컬 Minikube 환경과 K8s에 최적화된 경량화 스택 선택.
    * **Native Manifest:** Helm의 마법에 의존하지 않고, 직접 YAML을 작성하여 동작 원리(RBAC, ConfigMap)를 파악함.

## 2. 아키텍처 (Architecture)
> "감시탑(Prometheus)이 망원경으로 상태를 감시하고, 블랙박스(Loki)가 사고 기록을 저장하면, 지휘 통제실(Grafana)에서 통합 관제한다."

### Phase 1: Monitoring (The Eye)
- Prometheus: Pull 방식으로 Node(Kubelet)와 Pod(cAdvisor)의 리소스 사용량 수집.
- Grafana: 수집된 데이터를 시각화. (Provisioning으로 자동 연결)

### Phase 2: Logging (The Memory)
- Loki: 로그 데이터를 인덱싱하지 않고 '라벨' 기반으로 저장하는 초경량 로그 DB.
- Promtail: 모든 노드에 DaemonSet으로 배포되어 로그를 수집해 Loki로 전송.

## 3. 핵심 구현 내용: Phase 1 (Monitoring)
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
- 해결: `nodes/metrics` 리소스에 대한 조회 권한 명시적 추가.

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

- ConfigMap: K8s API를 통해 동적으로 타겟(Node/Pod)을 발견하도록 설정 (`kubernetes_sd_configs`).

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

- Provisioning: Grafana 기동 시 Datasource(Prometheus)가 자동 등록되도록 설정.

```yaml
# grafana-config.yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090 # K8s 내부 DNS 사용 (IP 불필요)
    isDefault: true
```

## 4. 핵심 구현 내용: Phase 2 (Logging)

① 로그 수집기 배포: DaemonSet

로그 수집기는 특정 노드에만 있는 게 아니라, 모든 노드에 하나씩 무조건 있어야 함. 따라서 `Deployment`가 아닌 `DaemonSet`을 사용.

② 심볼릭 링크와 볼륨 마운트 (Key Issue)

Minikube/Docker 환경에서 `/var/log/pods`는 **심볼릭 링크(바로가기)**임. 원본 파일은 `/var/lib/docker/containers`에 숨겨져 있음.
- 문제: Promtail이 바로가기만 보고 "파일은 있는데 내용이 없네?"라며 수집 실패.
- 해결: hostPath를 사용하여 호스트의 Docker 컨테이너 경로를 직접 마운트해줌.

```yaml
# promtail-daemonset.yaml (핵심 수정)
volumeMounts:
  - name: pods
    mountPath: /var/log/pods           # 바로가기 경로
  - name: docker
    mountPath: /var/lib/docker/containers # ★ 핵심: 원본 파일 경로 마운트
volumes:
  - name: docker
    hostPath:
      path: /var/lib/docker/containers
```

③ 노드 필터링 (Optimization)

Promtail이 남의 노드 로그까지 긁으려다 에러가 나지 않도록, **"내 노드(`spec.nodeName`)의 로그만 수집"**하도록 설정.

- 구현: DaemonSet에서 `HOSTNAME` 환경변수 주입 -> Config에서 `relabel_configs`로 필터링.

## 5. 트러블슈팅 & 학습 노트 (Troubleshooting Log)

### [Monitoring Issues]
* **Issue 1: Minikube 메모리 부족 (OOMKilled)**
    * **증상:** 파드가 뜨다가 `CrashLoopBackOff` 또는 `OOMKilled`.
    * **해결:** WSL2 `.wslconfig` 수정 및 Minikube 메모리 7GB 할당.

* **Issue 2: Prometheus Target 403 Forbidden**
    * **증상:** 타겟 목록에서 `kubernetes-nodes`가 `DOWN` 상태, 에러 메시지는 Forbidden.
    * **해결:** ClusterRole에 `nodes/metrics` 권한 추가.

* **Issue 3: Grafana "No Data"**
    * **증상:** 대시보드 임포트(ID: 14282, 315) 후 데이터가 안 뜸.
    * **원인:** 데이터 수집 시간 부족 및 부하 없음.
    * **해결:** 시간 범위를 `Last 5 minutes`로 좁히거나 `Explore` 탭에서 직접 쿼리 검증.

### [Logging Issues]
* **Issue 4: Promtail "Pods is Forbidden"**
    * **증상:** 로그에 `User "system:serviceaccount...promtail" cannot list resource "pods"` 에러 발생.
    * **해결:** Promtail용 `ClusterRole` 및 `ServiceAccount` 생성 후 바인딩.

* **Issue 5: Logs Not Found (Empty Result)**
    * **증상:** 타겟은 잡히는데(`Start tailing`), Grafana에서 로그 검색 시 결과가 없음.
    * **원인:** 심볼릭 링크 문제. Promtail이 원본 파일(`/var/log/pods`)만 보고 실제 내용에는 접근하지 못함.
    * **해결:** DaemonSet에 `/var/lib/docker/containers` 볼륨 마운트 추가 (Standard 방식).

* **Issue 6: Timezone Mismatch**
    * **증상:** 로그가 수집되는데 `Last 1 hour`에서 안 보임.
    * **해결:** Minikube 시간이 PC 시간과 어긋남 -> Grafana 조회 범위를 `Last 24 hours`로 넓혀서 확인.

## 6. 실행 방법 (How to Run)
```bash
# 1. 프로젝트 루트 이동
cd msa

# 2. 관제 시스템 전체 배포 (순서 무관)
kubectl apply -f k8s/observability/prometheus
kubectl apply -f k8s/observability/grafana
kubectl apply -f k8s/observability/loki
kubectl apply -f k8s/observability/promtail

# 3. 웹 접속 확인
minikube service grafana # ID/PW: admin / admin
```
