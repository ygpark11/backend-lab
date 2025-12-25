# Stage 1: Build (Node.js 환경)
FROM node:22-alpine AS builder

WORKDIR /app

# 패키지 정보 복사 및 설치
COPY package.json package-lock.json ./
RUN npm install

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# Stage 2: Serve (Nginx 환경)
FROM nginx:alpine

# 🔥 [추가] 1. 타임존 데이터 설치 (Alpine은 이게 없으면 시간이 안 바뀜)
RUN apk add --no-cache tzdata

# 🔥 [추가] 2. 한국 시간 환경변수 설정
ENV TZ=Asia/Seoul

# Nginx 설정 파일 덮어쓰기
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 결과물(dist)을 Nginx 웹 루트로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 80번 포트 오픈
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]