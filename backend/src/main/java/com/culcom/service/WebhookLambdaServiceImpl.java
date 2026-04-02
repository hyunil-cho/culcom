package com.culcom.service;

import com.culcom.config.AwsWebhookProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.apigatewayv2.ApiGatewayV2Client;
import software.amazon.awssdk.services.apigatewayv2.model.*;
import software.amazon.awssdk.services.lambda.LambdaClient;
import software.amazon.awssdk.services.lambda.model.*;
import software.amazon.awssdk.services.lambda.model.Runtime;

import java.util.Map;

@Slf4j
@Service
public class WebhookLambdaServiceImpl implements WebhookLambdaService {

    private final AwsWebhookProperties props;
    private final LambdaClient lambdaClient;
    private final ApiGatewayV2Client apiGatewayClient;

    public WebhookLambdaServiceImpl(AwsWebhookProperties props) {
        this.props = props;
        Region region = Region.of(props.getRegion());
        this.lambdaClient = LambdaClient.builder().region(region).build();
        this.apiGatewayClient = ApiGatewayV2Client.builder().region(region).build();
    }

    @Override
    public String deploy() {
        String functionName = props.getFunctionPrefix() + "router";

        Map<String, String> envVars = Map.of(
                "DB_HOST", props.getDbHost(),
                "DB_PORT", String.valueOf(props.getDbPort()),
                "DB_NAME", props.getDbName(),
                "DB_USERNAME", props.getDbUsername(),
                "DB_PASSWORD", props.getDbPassword()
        );

        String functionArn;

        try {
            // 이미 존재하면 코드 + 설정 업데이트
            lambdaClient.getFunction(GetFunctionRequest.builder()
                    .functionName(functionName).build());

            lambdaClient.updateFunctionCode(UpdateFunctionCodeRequest.builder()
                    .functionName(functionName)
                    .s3Bucket(props.getS3Bucket())
                    .s3Key(props.getS3Key())
                    .build());

            UpdateFunctionConfigurationResponse updated = lambdaClient.updateFunctionConfiguration(
                    UpdateFunctionConfigurationRequest.builder()
                            .functionName(functionName)
                            .environment(Environment.builder().variables(envVars).build())
                            .timeout(props.getTimeout())
                            .memorySize(props.getMemorySize())
                            .build());

            functionArn = updated.functionArn();
            log.info("Lambda 함수 업데이트 완료: {}", functionArn);

        } catch (ResourceNotFoundException e) {
            // 신규 생성
            CreateFunctionResponse created = lambdaClient.createFunction(
                    CreateFunctionRequest.builder()
                            .functionName(functionName)
                            .runtime(Runtime.fromValue(props.getRuntime()))
                            .handler(props.getHandler())
                            .role(props.getLambdaRoleArn())
                            .code(FunctionCode.builder()
                                    .s3Bucket(props.getS3Bucket())
                                    .s3Key(props.getS3Key())
                                    .build())
                            .timeout(props.getTimeout())
                            .memorySize(props.getMemorySize())
                            .environment(Environment.builder().variables(envVars).build())
                            .build());

            functionArn = created.functionArn();
            log.info("Lambda 함수 생성 완료: {}", functionArn);

            // API Gateway 권한 부여
            try {
                lambdaClient.addPermission(AddPermissionRequest.builder()
                        .functionName(functionName)
                        .statementId("apigateway-invoke")
                        .action("lambda:InvokeFunction")
                        .principal("apigateway.amazonaws.com")
                        .build());
            } catch (Exception ex) {
                log.warn("Lambda 권한 추가 실패 (이미 존재할 수 있음): {}", ex.getMessage());
            }

            // API Gateway에 /webhook/{id} 라우트 생성
            if (props.getApiGatewayId() != null) {
                createApiRoute(functionArn);
            }
        }

        return functionArn;
    }

    @Override
    public String getStatus() {
        String functionName = props.getFunctionPrefix() + "router";
        try {
            GetFunctionResponse response = lambdaClient.getFunction(
                    GetFunctionRequest.builder().functionName(functionName).build());
            return response.configuration().stateAsString();
        } catch (ResourceNotFoundException e) {
            return "NotFound";
        } catch (Exception e) {
            log.error("Lambda 상태 조회 실패", e);
            return "Error";
        }
    }

    @Override
    public void destroy() {
        String functionName = props.getFunctionPrefix() + "router";
        try {
            lambdaClient.deleteFunction(DeleteFunctionRequest.builder()
                    .functionName(functionName).build());
            log.info("Lambda 함수 삭제 완료: {}", functionName);
        } catch (ResourceNotFoundException e) {
            log.warn("Lambda 함수를 찾을 수 없음: {}", functionName);
        }
    }

    private void createApiRoute(String functionArn) {
        try {
            CreateIntegrationResponse integration = apiGatewayClient.createIntegration(
                    CreateIntegrationRequest.builder()
                            .apiId(props.getApiGatewayId())
                            .integrationType(IntegrationType.AWS_PROXY)
                            .integrationUri(functionArn)
                            .payloadFormatVersion("2.0")
                            .build());

            apiGatewayClient.createRoute(CreateRouteRequest.builder()
                    .apiId(props.getApiGatewayId())
                    .routeKey("ANY /webhook/{id}")
                    .target("integrations/" + integration.integrationId())
                    .build());

            log.info("API Gateway 라우트 생성 완료: ANY /webhook/{id}");
        } catch (Exception e) {
            log.error("API Gateway 라우트 생성 실패: {}", e.getMessage(), e);
        }
    }
}
