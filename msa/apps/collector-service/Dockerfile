FROM mcr.microsoft.com/playwright/python:v1.58.0-jammy

ENV PYTHONUNBUFFERED=1
WORKDIR /app

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Seoul

# 1. 시스템 패키지 설치
# tzdata 설치 시 위 설정을 보고 자동으로 Asia/Seoul로 잡고 넘어갑니다.
RUN apt-get update && apt-get install -y \
    curl \
    vim \
    tzdata \
    && ln -fs /usr/share/zoneinfo/Asia/Seoul /etc/localtime \
    && dpkg-reconfigure -f noninteractive tzdata \
    && rm -rf /var/lib/apt/lists/*

# 2. 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. 소스 복사 및 실행
COPY . .
CMD ["python", "batch_crawler.py"]