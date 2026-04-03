package com.culcom.dto.webhook;

import com.culcom.entity.WebhookLog;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class WebhookLogResponse {
    private Long seq;
    private Long webhookConfigSeq;
    private Long customerSeq;
    private Long branchSeq;
    private String sourceName;
    private String rawRequest;
    private String parsedParams;
    private String mappedData;
    private String status;
    private String errorMessage;
    private String remoteIp;
    private LocalDateTime createdDate;

    public static WebhookLogResponse from(WebhookLog entity) {
        return WebhookLogResponse.builder()
                .seq(entity.getSeq())
                .webhookConfigSeq(entity.getWebhookConfig() != null ? entity.getWebhookConfig().getSeq() : null)
                .customerSeq(entity.getCustomer() != null ? entity.getCustomer().getSeq() : null)
                .branchSeq(entity.getBranch() != null ? entity.getBranch().getSeq() : null)
                .sourceName(entity.getSourceName())
                .rawRequest(entity.getRawRequest())
                .parsedParams(entity.getParsedParams())
                .mappedData(entity.getMappedData())
                .status(entity.getStatus())
                .errorMessage(entity.getErrorMessage())
                .remoteIp(entity.getRemoteIp())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
