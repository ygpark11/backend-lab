# 1. 빌드 환경 (Gradle) - 선택사항이지만 일단 지금은 빌드된 JAR를 복사하는 방식 사용
# 편의를 위해 "이미 빌드된 JAR"를 담는 심플한 방식을 택합니다.
FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# 빌드된 JAR 파일을 컨테이너로 복사
# (나중에 ./gradlew clean build 명령어가 필요함)
COPY build/libs/*SNAPSHOT.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]