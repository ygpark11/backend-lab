# 🚀 배포 및 인프라 가이드 (Deployment & Infrastructure)

이 문서는 로컬 개발 환경 실행부터 오라클 클라우드(Oracle Cloud) 운영 서버 배포, 그리고 CI/CD 파이프라인의 구조를 설명합니다.

---

## 1. 환경 변수 설정 (Environment Variables)

보안을 위해 `.env` 파일은 깃허브에 업로드되지 않습니다. 아래 템플릿을 참고하여 각 환경에 맞는 설정 파일을 생성해야 합니다.

### 🔹 `.env` (Backend & Runtime)
서버 실행 시점(Runtime)에 주입되는 OS 환경변수입니다. `apps/catalog-service` 및 운영 서버 루트에 위치해야 합니다.

```bash
# [Database]
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=pstracker
MYSQL_USER=pstracker_user
MYSQL_PASSWORD=your_db_password

# [Application]
APP_PROFILE=prod
LOG_LEVEL=INFO

# [Security & Auth]
JWT_SECRET=your_very_long_base64_secret_key_minimum_32_chars
OAUTH_CLIENT_ID=your_google_client_id
OAUTH_CLIENT_SECRET=your_google_client_secret

# [External API]
DISCORD_WEBHOOK_URL=[https://discord.com/api/webhooks/](https://discord.com/api/webhooks/)...
GOOGLE_AI_KEY=your_gemini_api_key

...
```

- ⚠️ 중요 (Build-Time Injection): React 앱은 Docker Image 빌드 시점에 위 변수들이 자바스크립트 코드로 치환(Hard-coding)됩니다. 따라서 운영 환경 배포 시에는 .env 파일이 아닌 GitHub Actions Secrets와 Docker Build Args를 통해 값을 주입해야 합니다.

---

## 2. 로컬 개발 환경 실행 (Local Development)
개발 편의성을 위해 API(Brain)와 크롤러(Hand)를 하나의 Docker Compose로 통합하여 실행합니다.

### 📋 사전 준비 (Prerequisites)
- Docker Desktop & Docker Compose 설치
- Java 21+ (IntelliJ 로컬 디버깅용)
- Node.js 20+ (프론트엔드 로컬 실행용)

### 🚀 실행 명령어 (Run Command)
프로젝트 루트(msa/)에서 실행합니다.

```bash
# 1. 통합 개발 환경 실행 (DB, API, Frontend, Crawler, Adminer)
docker compose -f docker-compose-local.yml up -d --build

# 2. 로그 확인 (실시간)
docker compose logs -f docker-compose-local.yml
```

### 📡 접속 정보

| 서비스 | URL                                   | 설명 |
| :--- |:--------------------------------------| :--- |
| **Frontend** | `http://localhost`                    | React 웹 애플리케이션 (Nginx) |
| **Backend API** | `http://localhost:8080`               | Spring Boot API 서버 |
| **Crawler Logs** | `docker logs -f ps-tracker-collector` | Playwright는 Headless로 동작하므로 docker logs로 확인 |
| **DB Admin** | `http://localhost:8090`               | Adminer (MySQL GUI 도구) |

---

## 3. 운영 서버 배포 (Production Deployment)
운영 환경(Oracle Cloud)에서는 리소스 격리를 위해 **Brain(Node 1)** 과 **Hand(Node 2)** 로 서버를 물리적으로 분리하여 배포합니다.

### 🏗️ 인프라 아키텍처 (Multi-Node)
- Node 1 (Brain, A1 ARM64): `10.0.0.12` (Private IP) / API, DB, Frontend, Caddy, Alloy — Oracle A1 ARM64 2코어 8GB RAM
- Node 2 (Hand): `10.0.0.61` (Private IP) / Python Crawler, Playwright (Headless)
- Node 3 (예정): 기존 AMD 서버 재활용 / Python Crawler — Node 2와 샤딩 구성으로 수집 속도 개선

#### ① Node 1: Brain Server 배포
```bash
# 1. 최신 이미지 Pull & 실행
docker compose -f docker-compose-brain.yml pull
docker compose -f docker-compose-brain.yml up -d

# 2. 불필요한 이미지 정리
docker image prune -f
```

#### ② Node 2: Hand Server 배포
```bash
# 1. 최신 이미지 Pull & 실행
docker compose -f docker-compose.hand.yml pull
docker compose -f docker-compose.hand.yml up -d
```

#### 🧪 네트워크 연결 테스트
Node 1(Brain)에서 Node 2(Hand)로 사설 통신이 가능한지 확인합니다.
```bash
# Node 1 터미널에서 실행
curl -X POST [http://10.0.0.61:5000/run](http://10.0.0.61:5000/run)
# 예상 응답: {"status": "started"}
```

---

## 4. CI/CD 파이프라인 (GitHub Actions)

**Zero-Touch Deployment**를 위해 코드가 푸시되면 빌드부터 배포까지 자동으로 수행됩니다.

### 🏭 전략: Build Time vs Run Time (The Separation)
로컬 개발 환경과 달리, CI/CD 환경에서는 **"변수 주입 시점"** 이 핵심입니다. 우리는 보안과 프레임워크 특성에 따라 주입 시점을 엄격히 분리했습니다.

| 구분 | Build Time (공장/조립) | Run Time (현장/실행) |
| :--- | :--- | :--- |
| **개념** | 도커 이미지를 굽는(Build) 시점 | 컨테이너를 실행(Up)하는 시점 |
| **주체** | **GitHub Actions** (Runner) | **Operating Server** (Brain/Hand) |
| **대상** | **Frontend (React)** | **Backend (Java/Python)** |
| **이유** | React는 빌드 시점에 환경변수가 JS 코드로 치환(Hardcoded)되어 정적 파일로 변환됨. | 서버 애플리케이션은 실행 시점에 OS 환경변수나 파일을 읽어서 동적으로 설정함. |
| **방법** | `ARG` & `build-args`로 GitHub Secrets 주입 | `env_file` (.env) 및 `Volume Mount`로 서버 파일 주입 |

### 🔄 파이프라인 흐름도 (Workflow Diagram)
개발자가 코드를 푸시하면 **'공장(CI)'**에서 이미지를 만들고, **'현장(CD)'**으로 배송하여 실행하며, **'관제탑(Alloy)'**이 이를 감시하는 구조입니다.

```mermaid
graph TD
    User[👨‍💻 Developer] -->|Git Push| Repo["GitHub Repository"]
    
    subgraph "CI: The Factory (GitHub Actions)"
        Repo -->|Trigger| Action["🚀 Workflow Start"]
        Action -->|Inject Secrets| Build["🐳 Docker Build"]
        
        NoteBuild["Frontend: ARG 주입 (Build Time)<br/>Backend: 순수 코드 빌드"]
        Build -.- NoteBuild
        
        Build -->|Push| Hub["📦 Docker Hub"]
    end
    
    subgraph "CD: The Field (Production Servers)"
        Hub -->|SSH Trigger| Brain["🖥️ Node 1: Brain"]
        Hub -->|SSH Trigger| Hand["🖥️ Node 2: Hand"]
        
        Brain -->|Pull Image| BrainRun["🏃 Run Container"]
        Hand -->|Pull Image| HandRun["🏃 Run Container"]
        
        NoteDeploy["Backend: .env 주입 (Run Time)<br/>Volume: Firebase Key 마운트"]
        BrainRun -.- NoteDeploy
    end
    
    subgraph "Observability: The Eye (Grafana Cloud)"
        BrainRun -->|Metric & Log| Alloy["🕵️ Alloy Agent"]
        Alloy -->|Push| Grafana["📊 Grafana Dashboard"]
        Grafana -.->|Alert| Discord["🔔 Discord Alert"]
    end
    
    %% 주석 노드 스타일링 (흰색 배경, 점선 테두리)
    style NoteBuild fill:#fff,stroke:#333,stroke-dasharray: 5 5
    style NoteDeploy fill:#fff,stroke:#333,stroke-dasharray: 5 5
```

### 🔄 워크플로우 파일 구조 (`.github/workflows/`)

| 파일명 | 역할 | 트리거 조건 |
| :--- | :--- | :--- |
| `deploy-brain.yml` | Backend(Java) 빌드·테스트 및 Node 1 배포 | `apps/catalog-service/**` 변경 시 |
| `deploy-face.yml` | Frontend(React) 빌드 및 Node 1 배포 | `apps/frontend/**` 변경 시 |
| `deploy-hand.yml` | Crawler(Python) 빌드 및 Node 2 배포 | `apps/collector-service/**` 변경 시 |
| `deploy-observability.yml` | Alloy(Monitoring) 설정 배포 및 재시작 | `config.alloy` 변경 시 |

### 🛠️ 빌드 타임 변수 주입 전략 (Frontend)
React는 런타임에 환경변수를 읽을 수 없으므로, Docker 빌드 시점에 값을 주입하는 것이 핵심입니다.

#### 1. Dockerfile (`apps/frontend/Dockerfile`)

```Dockerfile
# ARG로 변수 선언
ARG VITE_API_BASE_URL
ARG VITE_FIREBASE_API_KEY
#...

# ENV로 변환하여 빌드 과정에서 사용 가능하게 함
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
#...
RUN npm run build
```

#### 2. GitHub Actions (`deploy-face.yml`)

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    build-args: |
      VITE_API_BASE_URL=${{ secrets.VITE_API_BASE_URL }}
      VITE_FIREBASE_API_KEY=${{ secrets.VITE_FIREBASE_API_KEY }}
      VITE_GA_MEASUREMENT_ID=${{ secrets.VITE_GA_MEASUREMENT_ID }}
      # ... (기타 Firebase 설정)
```
#### 🗝️ 환경 변수 관리 전략 (Secrets Management)
- GitHub Secrets: CI 단계에서 필요한 빌드 재료(React Key)와 배포 자격 증명(SSH Key, Docker ID)을 암호화하여 저장.
- Server .env: CD 단계(런타임)에서 필요한 DB 비밀번호, Discord URL 등은 운영 서버 내부의 `.env` 파일로 격리하여 관리.
- Hybrid Loading: FirebaseConfig 등 핵심 설정 클래스는 "환경변수가 있으면 그것을(Prod), 없으면 내부 파일을(Local)" 읽도록 설계하여 코드 수정 없이 환경 대응.

### 🛡️ 신뢰성 중심 배포 (Reliability-First Deployment)
기존에는 빌드 속도를 위해 테스트를 생략(`-x test`)했으나, 안정성 확보를 위해 **배포 전 테스트 수행을 의무화**했습니다.
- CI 파이프라인의 독립 스텝(`Run Tests`)에서 `./gradlew test`가 수행됩니다.
- Dockerfile 내 빌드는 `-x test`로 테스트를 제외하여 빌드 시간을 단축하고, 테스트와 빌드의 역할을 명확히 분리했습니다.
- 테스트 실패 시(Red) 이후 단계가 즉시 중단되어, 결함 있는 코드가 운영 서버에 배포되는 것을 원천 차단합니다.

---

## 5. SSL 인증서 설정 (Caddy — 현재)

Nginx + Certbot 방식에서 **Caddy**로 전환하여 SSL 인증서 관리를 완전 자동화했습니다.

### 🔒 Caddy 설정 (Caddyfile)

```
ps-signal.com, www.ps-signal.com {
    reverse_proxy frontend:80
}
```

이 3줄만으로 Let's Encrypt 인증서 발급, 갱신, HTTPS 리다이렉트를 Caddy가 내부에서 모두 처리합니다. 별도의 crontab, certbot 컨테이너, 볼륨 마운트가 필요 없습니다.

> **이전 방식 (Nginx + Certbot, 현재 미사용)**
>
> 초기에는 Certbot + crontab으로 Let's Encrypt 인증서를 발급/갱신했습니다.
> 서버 이전 시마다 certbot 컨테이너·crontab·볼륨 마운트를 모두 재구성해야 하는 운영 부담이 있었으며,
> Oracle A1 신규 서버 이전을 계기로 Caddy로 전환하여 이 부담을 완전히 제거했습니다.

---

## 6. 멀티 아키텍처 빌드 전략 (Multi-Architecture Build)

### 🏗️ 배경: ARM64 서버 이전과 에뮬레이션 문제

Oracle A1 ARM64 서버로 이전 후, 초기에는 기존 AMD64 이미지에 `platform: linux/arm64`를 추가하여 실행했습니다. 그러나 성능 체감이 없었는데, 원인은 **QEMU가 런타임에 모든 CPU 명령어를 실시간 번역**하여 실제 서버 성능의 30~50%만 발휘되었기 때문입니다.

### 🔧 해결: 플랫폼별 네이티브 이미지 빌드

GitHub Actions의 **QEMU + Buildx** 조합으로 `linux/amd64,linux/arm64` 멀티 플랫폼 이미지를 빌드하여 Docker Hub에 푸시합니다. A1 서버는 자신의 아키텍처에 맞는 ARM64 네이티브 이미지를 자동으로 선택하여 실행하므로 에뮬레이션 오버헤드가 없습니다.

```yaml
- name: Build and Push Docker Image
  uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64,linux/arm64  # 두 아키텍처 동시 빌드
    push: true
```

이 방식은 **인프라 이식성(Portability)**도 보장합니다. Docker Hub에 올라간 이미지가 어떤 아키텍처 서버에서도 최적 성능으로 실행 가능하므로, 이후 서버 이전 시 코드 수정 없이 즉시 배포 가능합니다.

### ⚡ 프론트엔드 Builder 스테이지 최적화

`npm ci`는 QEMU 에뮬레이션 환경에서 **4시간 이상 소요 후 크래시**(`Illegal instruction`)가 발생했습니다. `FROM --platform=$BUILDPLATFORM`으로 Builder 스테이지를 CI 러너(AMD64)의 네이티브 환경에서 실행하여 해결했습니다.

```dockerfile
# Builder는 CI 러너(AMD64)에서 네이티브로 실행 → npm 크래시 없음
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
RUN npm ci && npm run build

# Final 스테이지는 타겟 플랫폼(ARM64)으로 빌드됨
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

이 방식은 **자급자족 Dockerfile**을 유지하면서(로컬 `docker build .` 정상 동작), CI 빌드 시간도 대폭 단축합니다.