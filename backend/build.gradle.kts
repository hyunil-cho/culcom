
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

// ============================================
// Docker 이미지 빌드 → ECR 로그인 → 태그 → 푸시 자동화
// ============================================
val dockerImageName = "culcom"
val ecrRegistry = "104322896221.dkr.ecr.ap-northeast-2.amazonaws.com"
val ecrRepository = "culcom-app"
val ecrTag = "latest"
val awsRegion = "ap-northeast-2"
val awsProfile = "culcom"
val ecrFullRef = "$ecrRegistry/$ecrRepository:$ecrTag"

// Dockerfile 은 프로젝트 루트(backend/ 의 부모)에 있고, backend/ 와 frontend/ 모두를
// COPY 하므로 빌드 컨텍스트도 루트로 잡아야 한다.
val dockerBuildContext = file("..")

fun shellInvoke(cmd: String): List<String> {
    val isWindows = System.getProperty("os.name").lowercase().contains("windows")
    return if (isWindows) listOf("cmd", "/c", cmd) else listOf("bash", "-c", cmd)
}

tasks.register<Exec>("dockerBuild") {
    group = "docker"
    description = "프로젝트 루트의 Dockerfile 로 '$dockerImageName' 이미지를 빌드한다."
    workingDir = dockerBuildContext
    commandLine("docker", "build", "-t", dockerImageName, ".")
}

tasks.register<Exec>("dockerEcrLogin") {
    group = "docker"
    description = "AWS ECR 로그인 (profile=$awsProfile, region=$awsRegion)."
    commandLine(shellInvoke(
        "aws ecr get-login-password --region $awsRegion --profile $awsProfile | " +
        "docker login --username AWS --password-stdin $ecrRegistry"
    ))
}

tasks.register<Exec>("dockerTag") {
    group = "docker"
    description = "'$dockerImageName' 이미지를 ECR 레퍼런스($ecrFullRef)로 태깅."
    dependsOn("dockerBuild")
    commandLine("docker", "tag", dockerImageName, ecrFullRef)
}

tasks.register<Exec>("dockerPush") {
    group = "docker"
    description = "ECR 로 '$ecrFullRef' 이미지를 푸시."
    dependsOn("dockerTag", "dockerEcrLogin")
    commandLine("docker", "push", ecrFullRef)
}

tasks.register("dockerDeploy") {
    group = "docker"
    description = "Docker 빌드 → ECR 로그인 → 태그 → 푸시 전 과정 실행."
    dependsOn("dockerPush")
}
