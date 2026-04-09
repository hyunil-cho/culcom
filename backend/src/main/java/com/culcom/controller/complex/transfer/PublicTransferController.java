package com.culcom.controller.complex.transfer;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.transfer.TransferInviteInfoResponse;
import com.culcom.dto.transfer.TransferInviteSubmitRequest;
import com.culcom.dto.transfer.TransferPublicInfoResponse;
import com.culcom.service.TransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 공개 양도 페이지 API (인증 불필요).
 */
@RestController
@RequestMapping("/api/public/transfer")
@RequiredArgsConstructor
public class PublicTransferController {

    private final TransferService transferService;

    /** 양도자 페이지: 멤버십 정보 + 양도비 조회 */
    @GetMapping
    public ResponseEntity<ApiResponse<TransferPublicInfoResponse>> getByToken(
            @RequestParam String token) {
        return ResponseEntity.ok(ApiResponse.ok(transferService.getByToken(token)));
    }

    /** 양도자: 진행 확인 → 초대 토큰 생성 */
    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<TransferPublicInfoResponse>> confirm(
            @RequestParam String token) {
        return ResponseEntity.ok(ApiResponse.ok(transferService.confirmAndGenerateInvite(token)));
    }

    /** 양수자 초대 페이지: 양도 정보 + 동의항목 조회 */
    @GetMapping("/invite")
    public ResponseEntity<ApiResponse<TransferInviteInfoResponse>> getInviteInfo(
            @RequestParam String token) {
        return ResponseEntity.ok(ApiResponse.ok(transferService.getByInviteToken(token)));
    }

    /** 양수자: 동의 + 정보 제출 → Customer 생성 */
    @PostMapping("/invite/submit")
    public ResponseEntity<ApiResponse<Void>> submitInvite(
            @RequestParam String token, @Valid @RequestBody TransferInviteSubmitRequest req) {
        transferService.submitInvite(token, req);
        return ResponseEntity.ok(ApiResponse.ok("양도 접수가 완료되었습니다.", null));
    }
}
