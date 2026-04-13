package com.culcom.controller.settings;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.settings.*;
import com.culcom.entity.enums.SmsEventType;
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

    // ── SMS 이벤트 설정 ──

    @GetMapping("/sms-events")
    public ResponseEntity<ApiResponse<List<SmsEventConfigResponse>>> listSmsEventConfigs(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(settingsService.listSmsEventConfigs(principal.getSelectedBranchSeq())));
    }

    @GetMapping("/sms-events/{eventType}")
    public ResponseEntity<ApiResponse<SmsEventConfigResponse>> getSmsEventConfig(
            @PathVariable String eventType,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        SmsEventConfigResponse result = settingsService.getSmsEventConfig(
                principal.getSelectedBranchSeq(), SmsEventType.valueOf(eventType));
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/sms-events")
    public ResponseEntity<ApiResponse<SmsEventConfigResponse>> saveSmsEventConfig(
            @RequestBody SmsEventConfigRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        SmsEventConfigResponse result = settingsService.saveSmsEventConfig(request, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("설정이 저장되었습니다", result));
    }

    @DeleteMapping("/sms-events/{eventType}")
    public ResponseEntity<ApiResponse<Void>> deleteSmsEventConfig(
            @PathVariable String eventType,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        settingsService.deleteSmsEventConfig(principal.getSelectedBranchSeq(), SmsEventType.valueOf(eventType));
        return ResponseEntity.ok(ApiResponse.ok("설정이 삭제되었습니다", null));
    }

    @GetMapping("/sms-events/templates")
    public ResponseEntity<ApiResponse<List<MessageTemplateSimpleResponse>>> getSmsEventTemplates(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(settingsService.getTemplates(principal.getSelectedBranchSeq())));
    }

    @GetMapping("/sms-events/sender-numbers")
    public ResponseEntity<ApiResponse<List<String>>> getSmsEventSenderNumbers(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(settingsService.getSenderNumbers(principal.getSelectedBranchSeq())));
    }
}
