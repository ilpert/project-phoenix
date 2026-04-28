FROM eclipse-temurin:11-jdk-jammy AS build
WORKDIR /app
COPY . .
RUN ./gradlew clean assemble --no-daemon

FROM eclipse-temurin:11-jre-jammy
WORKDIR /app
COPY --from=build /app/build/libs/app-1.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
