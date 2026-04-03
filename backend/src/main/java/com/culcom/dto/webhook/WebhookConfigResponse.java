package com.culcom.dto.webhook;

import com.culcom.entity.WebhookConfig;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class WebhookConfigResponse {
    private Long seq;
    private String name;
    private String sourceName;
    private String sourceDescription;
    private String httpMethod;
    private String requestContentType;
    private String requestHeaders;
    private String requestBodySchema;
    private Integer responseStatusCode;
    private String responseContentType;
    private String responseBodyTemplate;
    private String fieldMapping;
    private String authType;
    private String authConfig;
    private Boolean isActive;
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdateDate;

    public static WebhookConfigResponse from(WebhookConfig entity) {
        return WebhookConfigResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .sourceName(entity.getSourceName())
                .sourceDescription(entity.getSourceDescription())
                .httpMethod(entity.getHttpMethod())
                .requestContentType(entity.getRequestContentType())
                .requestHeaders(entity.getRequestHeaders())
                .requestBodySchema(entity.getRequestBodySchema())
                .responseStatusCode(entity.getResponseStatusCode())
                .responseContentType(entity.getResponseContentType())
                .responseBodyTemplate(entity.getResponseBodyTemplate())
                .fieldMapping(entity.getFieldMapping())
                .authType(entity.getAuthType())
                .authConfig(entity.getAuthConfig())
                .isActive(entity.getIsActive())
                .createdDate(entity.getCreatedDate())
                .lastUpdateDate(entity.getLastUpdateDate())
                .build();
    }
}
