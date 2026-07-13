# 🛠️ 운영 가이드 (Runbook)

로컬 실행, 운영 서버 배포, 외부 서비스 초기 설정 등 실제 운영에 필요한 절차를 정리한 운영자용 가이드입니다.

---

## 1. 환경 변수 설정

보안을 위해 `.env` 파일은 깃허브에 업로드되지 않습니다.

### `.env` (Backend & Runtime)
서버 실행 시점에 주입되는 OS 환경변수입니다. `apps/catalog-service` 및 운영 서버 루트에 위치해야 합니다.

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
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
GOOGLE_AI_KEY=your_gemini_api_key
...
```

> ⚠️ React 앱은 Docker Image 빌드 시점에 환경변수가 JS 코드로 치환됩니다. 운영 배포 시에는 `.env`가 아닌 GitHub Actions Secrets와 Docker Build Args로 주입해야 합니다. 상세 설명 → [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 2. 로컬 개발 환경 실행

Brain(Java/DB)과 Hand(Crawler)를 하나의 Docker Compose로 통합 실행합니다.

```bash
# 프로젝트 루트(msa/)에서 실행
docker compose -f docker-compose-local.yml up -d --build

# 로그 확인 (실시간)
docker compose -f docker-compose-local.yml logs -f
```

| 서비스 | URL | 설명 |
| :--- | :--- | :--- |
| Frontend | `http://localhost` | React 앱 (Nginx) |
| Backend API | `http://localhost:8080` | Spring Boot API |
| DB Admin | `http://localhost:8090` | Adminer (MySQL GUI) |
| Crawler Logs | `docker logs -f ps-tracker-collector` | Playwright Headless 로그 |

---

## 3. 운영 서버 배포

### Node 1 (Brain, A1 ARM64)
```bash
docker compose -f docker-compose-brain.yml pull
docker compose -f docker-compose-brain.yml up -d
docker image prune -f
```

### Node 2 (Collector Shard A, SHARD_ID=0)
```bash
docker compose -f docker-compose-hand.yml pull
docker compose -f docker-compose-hand.yml up -d
```

### Node 3 (Collector Shard B, SHARD_ID=1)
```bash
docker compose -f docker-compose-hand-3.yml pull
docker compose -f docker-compose-hand-3.yml up -d
```

### 네트워크 연결 확인
Node 1에서 수집기로 내부망 통신이 가능한지 확인합니다.
```bash
# Node 1 터미널에서 실행
curl http://10.0.0.61:5000/health  # Node 2 헬스 체크
# 예상 응답: {"status": "ok"}
```

---

## 4. Google OAuth2 초기 설정

Google Cloud Console에서 발급받아야 할 설정값입니다.

| 항목 | 설정값 |
| :--- | :--- |
| **Authorized JavaScript Origins** | `http://localhost:8080`, `https://ps-signal.com` |
| **Authorized Redirect URIs** | `http://localhost:8080/login/oauth2/code/google`<br>`https://ps-signal.com/login/oauth2/code/google` |
| **Scopes** | `email`, `profile` |

> Redirect URI의 `/login/oauth2/code/google`은 Spring Security 기본 경로입니다.

---

## 5. 시크릿 설정 파일

`application-secret.yml` (.gitignore 필수)

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: "발급받은_CLIENT_ID"
            client-secret: "발급받은_CLIENT_SECRET"
            scope:
              - email
              - profile
jwt:
  secret: "32글자_이상의_매우_긴_랜덤_시크릿_키_Base64_권장"
```

---

## 6. DB 백업 & 복구

### 백업 구성

| 항목 | 값 |
| :--- | :--- |
| **스크립트** | `/home/ubuntu/db_backup.sh` |
| **로그** | `/home/ubuntu/backup.log` |
| **스케줄** | 매일 23:00 KST (`cron: 0 14 * * *` — UTC 기준) |
| **저장소** | Oracle Object Storage (`ps-tracker-backup` 버킷, 네임스페이스: `axaiesjuor3l`) |
| **보관 정책** | 최근 7일치 유지, 초과분 자동 삭제 |
| **파일명 형식** | `pstracker_YYYY-MM-DD.sql.gz` |

백업 방식: `mysqldump --single-transaction --no-tablespaces | gzip | oci os object put` (스트리밍, 디스크 미사용)

### 백업 상태 확인

```bash
# 최근 백업 로그 확인
tail -20 /home/ubuntu/backup.log

# Object Storage 목록 확인
oci os object list --bucket-name ps-tracker-backup --query 'data[].{name:name,size:size}' --output table
```

### DB 복구 절차

```bash
# 1. 복구할 백업 파일 다운로드
oci os object get \
  --bucket-name ps-tracker-backup \
  --name pstracker_YYYY-MM-DD.sql.gz \
  --file /home/ubuntu/restore.sql.gz

# 2. 압축 해제 후 DB 복구
gunzip -c /home/ubuntu/restore.sql.gz | \
  docker exec -i ps-tracker-db \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}" pstracker

# 3. 복구 완료 후 임시 파일 삭제
rm /home/ubuntu/restore.sql.gz
```

> 복구 실행 전 현재 DB를 별도로 백업해두는 것을 권장합니다.
