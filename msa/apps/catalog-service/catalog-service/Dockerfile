# 1단계: 빌드 환경 (Builder)
FROM --platform=$BUILDPLATFORM eclipse-temurin:25-jdk-noble AS builder

WORKDIR /app

# Gradle 파일 복사
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# 권한 부여 및 의존성 설치 (BuildKit 캐시로 ~/.gradle 재사용)
RUN chmod +x ./gradlew
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew dependencies --no-daemon

# 소스 복사 및 빌드
COPY src src
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar --no-daemon -Duser.timezone=Asia/Seoul \
    && java -Djarmode=tools -jar build/libs/*SNAPSHOT.jar extract --layers --launcher --destination extracted

# 2단계: 실행 환경 (Runner)
FROM eclipse-temurin:25-jre-noble

WORKDIR /app

# Docker healthcheck용 curl 설치 (noble JRE 이미지 미포함)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Spring Boot Layered JAR 복사 (의존성 캐시 재사용으로 이미지 push/pull 효율화)
COPY --from=builder /app/extracted/dependencies/ ./
COPY --from=builder /app/extracted/spring-boot-loader/ ./
COPY --from=builder /app/extracted/snapshot-dependencies/ ./
COPY --from=builder /app/extracted/application/ ./

# 타임존 설정 (JVM 옵션은 JAVA_TOOL_OPTIONS 환경변수로 주입)
ENTRYPOINT ["java", "-Duser.timezone=Asia/Seoul", "org.springframework.boot.loader.launch.JarLauncher"]