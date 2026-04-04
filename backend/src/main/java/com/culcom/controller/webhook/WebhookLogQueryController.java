package com.culcom.controller.webhook;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.webhook.WebhookLogResponse;
import com.culcom.mapper.WebhookLogQueryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookLogQueryController {

    private final WebhookLogQueryMapper webhookLogQueryMapper;

    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<Page<WebhookLogResponse>>> logs(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long webhookSeq,
            @RequestParam(required = false) String status) {

        Long branchSeq = principal.getSelectedBranchSeq();
        int offset = page * size;

        List<WebhookLogResponse> list = webhookLogQueryMapper.search(branchSeq, webhookSeq, status, offset, size);
        int total = webhookLogQueryMapper.count(branchSeq, webhookSeq, status);

        Page<WebhookLogResponse> result = new PageImpl<>(list, PageRequest.of(page, size), total);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
