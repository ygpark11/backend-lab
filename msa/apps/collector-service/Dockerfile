# 기존 버전(3.10) 유지 (갑자기 3.11로 올리면 호환성 문제 생길 수 있음)
FROM python:3.10-slim

# 브라우저 설치 경로 고정 (캐시 관리 용이)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# 1. 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install "playwright>=1.41.0"
RUN playwright install --with-deps chromium

# -----------------------------------------------------------
# 2. 나머지 라이브러리 설치
# -----------------------------------------------------------
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 4. 실행
CMD ["python", "batch_crawler.py"]