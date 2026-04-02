package com.culcom.controller.external;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.integration.SmsSendRequest;
import com.culcom.dto.integration.SmsSendResponse;
import com.culcom.service.AuthService;
import com.culcom.service.SmsService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/external")
@RequiredArgsConstructor
public class ExternalServiceController {

    private final SmsService smsService;
    private final AuthService authService;

    /**
     * SMS/LMS 발송.
     * 메시지 바이트 길이에 따라 SMS(≤90) 또는 LMS(91~2000) 자동 결정.
     */
    @PostMapping("/sms/send")
    public ResponseEntity<ApiResponse<SmsSendResponse>> sendSms(
            @Valid @RequestBody SmsSendRequest request, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);

        log.info("SMS 발송 요청 - 지점: {}, 수신: {}, 발신: {}", branchSeq, request.getReceiverPhone(), request.getSenderPhone());

        SmsSendResponse result = smsService.sendByBranch(
                branchSeq,
                request.getSenderPhone(),
                request.getReceiverPhone(),
                request.getMessage(),
                request.getSubject()
        );

        if (!result.isSuccess()) {
            log.warn("SMS 발송 실패 - {}", result.getMessage());
            return ResponseEntity.ok(ApiResponse.error(result.getMessage()));
        }

        // 발송 성공 시 잔여건수 업데이트
        smsService.updateRemainingCount(branchSeq, result.getCols(), result.getMsgType());

        log.info("SMS 발송 성공 - Type: {}, 잔여: {}", result.getMsgType(), result.getCols());
        return ResponseEntity.ok(ApiResponse.ok(result.getMessage(), result));
    }
}
