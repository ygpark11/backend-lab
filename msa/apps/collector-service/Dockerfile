FROM mcr.microsoft.com/playwright/python:v1.58.0-jammy

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# 1. 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

# 2. 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. 소스 복사 및 실행
COPY . .
CMD ["python", "batch_crawler.py"]