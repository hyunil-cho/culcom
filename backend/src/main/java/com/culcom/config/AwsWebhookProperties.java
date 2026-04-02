package com.culcom.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "culcom.webhook.aws")
@Getter @Setter
public class AwsWebhookProperties {

    /** Lambda 실행 역할 ARN */
    private String lambdaRoleArn;

    /** 범용 Lambda 핸들러 코드가 저장된 S3 버킷 */
    private String s3Bucket;

    /** 범용 Lambda 핸들러 코드의 S3 키 */
    private String s3Key;

    /** Lambda 함수 런타임 (예: nodejs20.x, python3.12) */
    private String runtime = "python3.12";

    /** Lambda 핸들러 진입점 */
    private String handler = "index.handler";

    /** Lambda 타임아웃 (초) */
    private int timeout = 30;

    /** Lambda 메모리 (MB) */
    private int memorySize = 256;

    /** API Gateway ID (기존 HTTP API에 라우트를 추가하는 방식) */
    private String apiGatewayId;

    /** Lambda에 전달할 DB 접속 정보 */
    private String dbHost;
    private int dbPort = 3306;
    private String dbName;
    private String dbUsername;
    private String dbPassword;

    /** AWS 리전 */
    private String region = "ap-northeast-2";

    /** Lambda 함수 이름 접두사 */
    private String functionPrefix = "culcom-webhook-";
}
