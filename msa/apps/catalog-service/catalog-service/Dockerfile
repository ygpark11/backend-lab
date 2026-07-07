# 1단계: 빌드 환경 (Builder)
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-jammy AS builder

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
    ./gradlew build --no-daemon -x test -Duser.timezone=Asia/Seoul

# 2단계: 실행 환경 (Runner)
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

# 빌드 결과물 복사
COPY --from=builder /app/build/libs/*SNAPSHOT.jar app.jar

# 타임존 설정
ENTRYPOINT ["java", "-Duser.timezone=Asia/Seoul", "-jar", "app.jar"]