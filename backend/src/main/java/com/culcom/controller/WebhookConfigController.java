package com.culcom.controller;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.webhook.WebhookConfigRequest;
import com.culcom.dto.webhook.WebhookConfigResponse;
import com.culcom.entity.webhook.WebhookConfig;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.WebhookConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookConfigController {

    private final WebhookConfigRepository webhookRepository;
    private final BranchRepository branchRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WebhookConfigResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        List<WebhookConfigResponse> responses = webhookRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq)
                .stream()
                .map(WebhookConfigResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<WebhookConfigResponse>> get(@PathVariable Long seq) {
        return webhookRepository.findById(seq)
                .map(w -> ResponseEntity.ok(ApiResponse.ok(WebhookConfigResponse.from(w))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WebhookConfigResponse>> create(
            @RequestBody WebhookConfigRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
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
        return ResponseEntity.ok(ApiResponse.ok("웹훅이 등록되었습니다.", WebhookConfigResponse.from(webhookRepository.save(config))));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<WebhookConfigResponse>> update(
            @PathVariable Long seq, @RequestBody WebhookConfigRequest request) {
        return webhookRepository.findById(seq)
                .map(w -> {
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
                    return ResponseEntity.ok(ApiResponse.ok("웹훅이 수정되었습니다.", WebhookConfigResponse.from(webhookRepository.save(w))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        webhookRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("웹훅이 삭제되었습니다.", null));
    }

}
