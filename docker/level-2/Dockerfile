# 1. 베이스 이미지 선택 (요리의 기본 육수)
# 자바 17을 실행할 수 있는 최소한의 환경을 가져옵니다.
FROM openjdk:17-jdk-slim

# 2. 재료 담기 (메인 재료 넣기)
# 우리가 방금 만든 jar 파일을 컨테이너 안으로 복사하고, 이름을 app.jar로 바꿉니다.
COPY build/libs/*-SNAPSHOT.jar app.jar

# 3. 요리 시작 명령어 (밀키트 조리법)
# 컨테이너가 시작될 때 이 명령어를 실행하여 애플리케이션을 구동합니다.
ENTRYPOINT ["java", "-jar", "/app.jar"]