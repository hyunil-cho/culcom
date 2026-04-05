package com.culcom.controller.integration;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.integration.IntegrationServiceResponse;
import com.culcom.dto.integration.SmsConfigResponse;
import com.culcom.dto.integration.SmsConfigSaveRequest;
import com.culcom.service.IntegrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/integrations")
@RequiredArgsConstructor
public class IntegrationController {

    private final IntegrationService integrationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<IntegrationServiceResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        List<IntegrationServiceResponse> result = integrationService.list(principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/sms-config")
    public ResponseEntity<ApiResponse<SmsConfigResponse>> getSmsConfig(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        SmsConfigResponse result = integrationService.getSmsConfig(principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/sms-config")
    public ResponseEntity<ApiResponse<Void>> saveSmsConfig(
            @Valid @RequestBody SmsConfigSaveRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        try {
            integrationService.saveSmsConfig(request, principal.getSelectedBranchSeq());
            return ResponseEntity.ok(ApiResponse.ok("SMS 설정이 저장되었습니다.", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }
}
