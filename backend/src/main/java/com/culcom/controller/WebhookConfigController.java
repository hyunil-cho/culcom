package com.culcom.controller;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.webhook.WebhookConfigRequest;
import com.culcom.dto.webhook.WebhookConfigResponse;
import com.culcom.service.WebhookConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookConfigController {

    private final WebhookConfigService webhookConfigService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WebhookConfigResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        List<WebhookConfigResponse> result = webhookConfigService.list(principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<WebhookConfigResponse>> get(@PathVariable Long seq) {
        WebhookConfigResponse result = webhookConfigService.get(seq);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WebhookConfigResponse>> create(
            @Valid @RequestBody WebhookConfigRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        WebhookConfigResponse result = webhookConfigService.create(request, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("웹훅이 등록되었습니다.", result));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<WebhookConfigResponse>> update(
            @PathVariable Long seq, @RequestBody WebhookConfigRequest request) {
        WebhookConfigResponse result = webhookConfigService.update(seq, request);
        return ResponseEntity.ok(ApiResponse.ok("웹훅이 수정되었습니다.", result));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        webhookConfigService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("웹훅이 삭제되었습니다.", null));
    }
}
