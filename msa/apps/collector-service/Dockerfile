FROM python:3.10-slim

WORKDIR /app

# 필요한 파일 복사
COPY requirements.txt .
COPY batch_crawler.py .

# 라이브러리 설치
RUN pip install --no-cache-dir -r requirements.txt

# 실행 명령어 (Flask 서버 실행)
CMD ["python", "batch_crawler.py"]