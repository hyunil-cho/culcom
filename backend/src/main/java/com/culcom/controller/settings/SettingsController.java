package com.culcom.controller.settings;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.settings.MessageTemplateSimpleResponse;
import com.culcom.dto.settings.ReservationSmsConfigRequest;
import com.culcom.dto.settings.ReservationSmsConfigResponse;
import com.culcom.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping("/reservation-sms/templates")
    public ResponseEntity<ApiResponse<List<MessageTemplateSimpleResponse>>> getTemplates(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        List<MessageTemplateSimpleResponse> result = settingsService.getTemplates(principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/reservation-sms/sender-numbers")
    public ResponseEntity<ApiResponse<List<String>>> getSenderNumbers(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        List<String> result = settingsService.getSenderNumbers(principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/reservation-sms")
    public ResponseEntity<ApiResponse<ReservationSmsConfigResponse>> getReservationSmsConfig(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        ReservationSmsConfigResponse result = settingsService.getReservationSmsConfig(principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/reservation-sms")
    public ResponseEntity<ApiResponse<ReservationSmsConfigResponse>> saveReservationSmsConfig(
            @RequestBody ReservationSmsConfigRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        ReservationSmsConfigResponse result = settingsService.saveReservationSmsConfig(request, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("설정이 저장되었습니다", result));
    }
}
