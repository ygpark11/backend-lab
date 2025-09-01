# 1. 베이스 이미지 선택 (자바 17 실행 환경)
FROM openjdk:17-jdk-slim

# 2. 빌드된 jar 파일을 컨테이너 내부로 복사하고, 이름을 app.jar로 바꿉니다.
COPY build/libs/*-SNAPSHOT.jar app.jar

# 3. 컨테이너가 시작될 때 이 명령어를 실행하여 애플리케이션을 구동합니다.
ENTRYPOINT ["java", "-jar", "/app.jar"]