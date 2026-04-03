package com.culcom.dto.webhook;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WebhookConfigRequest {
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
}
