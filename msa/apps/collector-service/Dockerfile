FROM python:3.10-slim

WORKDIR /app

# 1. 라이브러리 명세서(requirements.txt)만 먼저 복사
COPY requirements.txt .

# 2. 라이브러리 설치
RUN pip install --no-cache-dir -r requirements.txt

# 3. 소스 코드 전체 복사
COPY batch_crawler.py .

# 실행 명령어 (Flask 서버 실행)
CMD ["python", "batch_crawler.py"]