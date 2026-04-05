package com.culcom.service;

import com.culcom.dto.webhook.WebhookConfigRequest;
import com.culcom.dto.webhook.WebhookConfigResponse;
import com.culcom.entity.webhook.WebhookConfig;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.WebhookConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WebhookConfigService {

    private final WebhookConfigRepository webhookRepository;
    private final BranchRepository branchRepository;

    public List<WebhookConfigResponse> list(Long branchSeq) {
        return webhookRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq)
                .stream()
                .map(WebhookConfigResponse::from)
                .toList();
    }

    public WebhookConfigResponse get(Long seq) {
        WebhookConfig config = webhookRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("웹훅"));
        return WebhookConfigResponse.from(config);
    }

    public WebhookConfigResponse create(WebhookConfigRequest request, Long branchSeq) {
        WebhookConfig config = WebhookConfig.builder()
                .name(request.getName())
                .sourceName(request.getSourceName())
                .sourceDescription(request.getSourceDescription())
                .httpMethod(request.getHttpMethod())
                .requestContentType(request.getRequestContentType())
                .requestHeaders(request.getRequestHeaders())
                .requestBodySchema(request.getRequestBodySchema())
                .responseStatusCode(request.getResponseStatusCode())
                .responseContentType(request.getResponseContentType())
                .responseBodyTemplate(request.getResponseBodyTemplate())
                .fieldMapping(request.getFieldMapping())
                .authType(request.getAuthType())
                .authConfig(request.getAuthConfig())
                .isActive(request.getIsActive())
                .build();
        branchRepository.findById(branchSeq).ifPresent(config::setBranch);
        return WebhookConfigResponse.from(webhookRepository.save(config));
    }

    public WebhookConfigResponse update(Long seq, WebhookConfigRequest request) {
        WebhookConfig w = webhookRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("웹훅"));
        w.setName(request.getName());
        w.setSourceName(request.getSourceName());
        w.setSourceDescription(request.getSourceDescription());
        w.setHttpMethod(request.getHttpMethod());
        w.setRequestContentType(request.getRequestContentType());
        w.setRequestHeaders(request.getRequestHeaders());
        w.setRequestBodySchema(request.getRequestBodySchema());
        w.setResponseStatusCode(request.getResponseStatusCode());
        w.setResponseContentType(request.getResponseContentType());
        w.setResponseBodyTemplate(request.getResponseBodyTemplate());
        w.setFieldMapping(request.getFieldMapping());
        w.setAuthType(request.getAuthType());
        w.setAuthConfig(request.getAuthConfig());
        w.setIsActive(request.getIsActive());
        return WebhookConfigResponse.from(webhookRepository.save(w));
    }

    public void delete(Long seq) {
        webhookRepository.deleteById(seq);
    }
}
