# --- 1단계: 빌드 환경 ---
# Gradle과 JDK 17이 설치된 이미지를 기반으로 시작
FROM gradle:jdk17-focal AS build

# 작업 디렉토리 설정
WORKDIR /home/gradle/src

# 빌드에 필요한 파일들만 먼저 복사하여 Gradle 캐시 활용
COPY build.gradle settings.gradle gradlew gradlew.bat ./
COPY gradle ./gradle

# 소스 코드 복사
COPY src ./src

# gradlew 파일에 실행 권한 부여
RUN chmod +x ./gradlew

# Gradle 빌드 실행 (테스트 포함)
RUN ./gradlew build --no-daemon

# --- 2단계: 실행 환경 ---
# 더 가벼운 JRE(Java 실행 환경) 이미지를 기반으로 시작
FROM eclipse-temurin:17-jre-jammy

# 작업 디렉토리 설정
WORKDIR /app

# 1단계(build)에서 생성된 JAR 파일을 복사
COPY --from=build /home/gradle/src/build/libs/*.jar app.jar

# 8080 포트 개방 (Render는 외부에서 10000 포트를 사용하지만, 컨테이너 내부 포트를 알려주는 것이 좋음)
EXPOSE 8080

# 컨테이너 시작 시 JAR 파일 실행
ENTRYPOINT ["java","-jar","/app/app.jar"]