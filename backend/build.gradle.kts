
plugins {
    java
    jacoco
    id("org.springframework.boot") version "3.4.4"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.culcom"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
}

dependencyManagement {
    imports {
        mavenBom("software.amazon.awssdk:bom:2.25.60")
    }
}

dependencies {
    implementation("software.amazon.awssdk:lambda")
    implementation("software.amazon.awssdk:apigatewayv2")
    implementation("software.amazon.awssdk:sts")

    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.mybatis.spring.boot:mybatis-spring-boot-starter:3.0.4")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.session:spring-session-jdbc")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.6")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    runtimeOnly("com.mysql:mysql-connector-j")
    runtimeOnly("com.h2database:h2")

    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
}
tasks.withType<Test> {
    useJUnitPlatform()
    // 테스트 fork 를 CPU 수 절반까지 병렬 실행 — Spring 컨텍스트 로딩이 대부분의 비용이므로
    // CPU 여유분만큼 선형 단축 효과. fork 별로 H2 in-memory DB 가 독립되므로 데이터 간섭 없음.
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).coerceAtLeast(1)
    // 각 fork 가 일정 테스트 수를 수행하면 JVM 을 재시작 — 메모리 누수·context leakage 방지.
    forkEvery = 100
}
