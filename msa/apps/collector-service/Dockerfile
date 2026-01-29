FROM python:3.10-slim

WORKDIR /app

# 1. 시스템 의존성 업데이트
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 2. 라이브러리 명세서 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. [핵심] Playwright 브라우저 및 OS 의존성 설치
# --with-deps: 리눅스에서 브라우저 실행에 필요한 라이브러리(Gstreamer 등)를 자동 설치
# chromium: 크롬만 쓰므로 파이어폭스/웹킷은 설치 안 함 (용량 절약)
RUN playwright install --with-deps chromium

# 4. 소스 코드 복사
COPY batch_crawler.py .

# 5. 실행
ENV PYTHONUNBUFFERED=1
CMD ["python", "batch_crawler.py"]