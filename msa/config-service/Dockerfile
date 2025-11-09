# --- 1단계: 빌드 환경 ('전문 주방') ---
# JDK와 Gradle이 포함된 무거운 빌드용 이미지
FROM gradle:jdk17-focal AS build
WORKDIR /home/gradle/src

# 소스코드 전체 복사
COPY . .

# gradlew 실행 권한 부여
RUN chmod +x ./gradlew

# (★표준 해결책 1★)
# 'build'를 실행하되, 'config-service' 같은 외부 의존성이 필요한 'test'는 제외
RUN ./gradlew build -x test --no-daemon

# --- 2단계: 실행 환경 ('밀키트') ---
# JRE만 포함된 가볍고 효율적인 배포용 이미지
FROM eclipse-temurin:17-jre-jammy

# (★표준 해결책 2★)
# 'docker-compose.yml'의 healthcheck가 사용할 'curl' 도구를 설치
# 'jammy'(Ubuntu/Debian 계열)는 apt-get을 사용
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# 작업 디렉터리 설정
WORKDIR /app

# '1단계(build)' 주방에서 완성된 '요리'(JAR 파일)만 쏙 빼서 복사
COPY --from=build /home/gradle/src/build/libs/*.jar app.jar

# 컨테이너 실행 명령어
ENTRYPOINT ["java","-jar","/app/app.jar"]