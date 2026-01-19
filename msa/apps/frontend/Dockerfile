# Stage 1: Build (Node.js 환경)
FROM node:22-alpine AS builder

WORKDIR /app

# 패키지 정보 복사 및 설치
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# 소스 코드 복사
COPY . .

# 빌드 시점에 변수 받아오기
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_FIREBASE_VAPID_KEY
ARG VITE_GA_MEASUREMENT_ID

# 환경변수로 설정 (Vite가 읽을 수 있게)
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID
ENV VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY
ENV VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID

# 빌드 실행
RUN npm run build

# Stage 2: Serve (Nginx 환경)
FROM nginx:alpine

# 1. 타임존 데이터 설치 (Alpine은 이게 없으면 시간이 안 바뀜)
RUN apk add --no-cache tzdata

# 2. 한국 시간 환경변수 설정
ENV TZ=Asia/Seoul

# Nginx 설정 파일 덮어쓰기
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

# 빌드된 결과물(dist)을 Nginx 웹 루트로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 80번 포트 오픈
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]