package com.culcom.controller.settings;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.settings.MessageTemplateSimpleResponse;
import com.culcom.dto.settings.ReservationSmsConfigRequest;
import com.culcom.dto.settings.ReservationSmsConfigResponse;
import com.culcom.entity.ReservationSmsConfig;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.MessageTemplateRepository;
import com.culcom.repository.MymunjaConfigInfoRepository;
import com.culcom.repository.ReservationSmsConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final ReservationSmsConfigRepository reservationSmsConfigRepository;
    private final MessageTemplateRepository messageTemplateRepository;
    private final MymunjaConfigInfoRepository mymunjaConfigInfoRepository;
    private final BranchRepository branchRepository;

    @GetMapping("/reservation-sms/templates")
    public ResponseEntity<ApiResponse<List<MessageTemplateSimpleResponse>>> getTemplates(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        List<MessageTemplateSimpleResponse> templates = messageTemplateRepository
                .findByBranchSeqAndIsActiveTrueOrderByIsDefaultDescLastUpdateDateDesc(branchSeq)
                .stream()
                .map(MessageTemplateSimpleResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(templates));
    }

    @GetMapping("/reservation-sms/sender-numbers")
    public ResponseEntity<ApiResponse<List<String>>> getSenderNumbers(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        List<String> numbers = mymunjaConfigInfoRepository.findSenderNumbersByBranchSeq(branchSeq);
        return ResponseEntity.ok(ApiResponse.ok(numbers));
    }

    @GetMapping("/reservation-sms")
    public ResponseEntity<ApiResponse<ReservationSmsConfigResponse>> getReservationSmsConfig(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        return reservationSmsConfigRepository.findByBranchSeq(branchSeq)
                .map(config -> ResponseEntity.ok(ApiResponse.ok(ReservationSmsConfigResponse.from(config))))
                .orElse(ResponseEntity.ok(ApiResponse.ok(null)));
    }

    @PostMapping("/reservation-sms")
    public ResponseEntity<ApiResponse<ReservationSmsConfigResponse>> saveReservationSmsConfig(
            @RequestBody ReservationSmsConfigRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();

        ReservationSmsConfig config = reservationSmsConfigRepository.findByBranchSeq(branchSeq)
                .orElseGet(() -> {
                    ReservationSmsConfig newConfig = new ReservationSmsConfig();
                    branchRepository.findById(branchSeq).ifPresent(newConfig::setBranch);
                    return newConfig;
                });

        messageTemplateRepository.findById(request.getTemplateSeq()).ifPresent(config::setTemplate);
        config.setSenderNumber(request.getSenderNumber());
        config.setAutoSend(request.getAutoSend());

        ReservationSmsConfig saved = reservationSmsConfigRepository.save(config);
        return ResponseEntity.ok(ApiResponse.ok("설정이 저장되었습니다", ReservationSmsConfigResponse.from(saved)));
    }
}