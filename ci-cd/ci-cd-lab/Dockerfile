# 1단계: 빌드 환경
FROM gradle:jdk17-focal AS build
WORKDIR /home/gradle/src
COPY . .
RUN chmod +x ./gradlew
RUN ./gradlew build --no-daemon

# 2단계: 실행 환경
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /home/gradle/src/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]