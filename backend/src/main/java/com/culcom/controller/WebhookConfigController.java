package com.culcom.controller;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.WebhookConfig;
import com.culcom.entity.WebhookLog;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.WebhookConfigRepository;
import com.culcom.repository.WebhookLogRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookConfigController {

    private final WebhookConfigRepository webhookRepository;
    private final WebhookLogRepository logRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WebhookConfig>>> list(HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        return ResponseEntity.ok(ApiResponse.ok(webhookRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq)));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<WebhookConfig>> get(@PathVariable Long seq) {
        return webhookRepository.findById(seq)
                .map(w -> ResponseEntity.ok(ApiResponse.ok(w)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WebhookConfig>> create(
            @RequestBody WebhookConfig request, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        branchRepository.findById(branchSeq).ifPresent(request::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("웹훅이 등록되었습니다.", webhookRepository.save(request)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<WebhookConfig>> update(
            @PathVariable Long seq, @RequestBody WebhookConfig request) {
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
                    w.setAuthKey(request.getAuthKey());
                    w.setIsActive(request.getIsActive());
                    return ResponseEntity.ok(ApiResponse.ok("웹훅이 수정되었습니다.", webhookRepository.save(w)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        webhookRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("웹훅이 삭제되었습니다.", null));
    }

    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<Page<WebhookLog>>> logs(
            HttpSession session,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long webhookSeq,
            @RequestParam(required = false) String status) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        var pageable = PageRequest.of(page, size);

        Page<WebhookLog> result;
        if (webhookSeq != null) {
            result = logRepository.findByWebhookConfigSeqOrderByCreatedDateDesc(webhookSeq, pageable);
        } else if (status != null && !status.isBlank()) {
            result = logRepository.findByBranchSeqAndStatusOrderByCreatedDateDesc(branchSeq, status, pageable);
        } else {
            result = logRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq, pageable);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
