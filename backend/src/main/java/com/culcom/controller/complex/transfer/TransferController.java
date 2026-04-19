package com.culcom.controller.complex.transfer;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.transfer.TransferCreateRequest;
import com.culcom.dto.transfer.TransferRequestResponse;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.service.TransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자용 양도 요청 API.
 */
@RestController
@RequestMapping("/api/transfer-requests")
@RequiredArgsConstructor
public class TransferController {

    private final TransferService transferService;

    /**
     * 현재 지점의 양도 요청 목록.
     * name/phone은 양도자(fromMember) 또는 양수자(toCustomer) 어느쪽과도 부분 매칭되면 반환.
     * status가 지정되면 그 상태만, 없으면 activeOnly로 생성/접수만 vs 전체 결정.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<TransferRequestResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phone,
            @RequestParam(defaultValue = "false") boolean activeOnly,
            @RequestParam(required = false) com.culcom.entity.enums.TransferStatus status,
            @RequestParam(defaultValue = "false") boolean includeReferenced) {
        Long branchSeq = principal.getSelectedBranchSeq();
        return ResponseEntity.ok(ApiResponse.ok(
                transferService.list(branchSeq, name, phone, activeOnly, status, includeReferenced)));
    }

    /** 이름+전화번호로 접수 상태의 양도 요청 조회 (회원등록 시 자동 감지용) */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<TransferRequestResponse>> findPending(
            @RequestParam String name, @RequestParam String phone) {
        TransferRequestResponse result = transferService.findPendingByRecipient(name, phone);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TransferRequestResponse>> create(
            @Valid @RequestBody TransferCreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("양도 요청이 생성되었습니다.", transferService.create(req)));
    }

    @PutMapping("/{seq}/status")
    public ResponseEntity<ApiResponse<TransferRequestResponse>> updateStatus(
            @PathVariable Long seq, @RequestParam TransferStatus status,
            @RequestParam(required = false) String adminMessage) {
        return ResponseEntity.ok(ApiResponse.ok("양도 요청 상태가 변경되었습니다.",
                transferService.updateStatus(seq, status, adminMessage)));
    }

    @PostMapping("/{seq}/complete")
    public ResponseEntity<ApiResponse<TransferRequestResponse>> complete(
            @PathVariable Long seq, @RequestParam Long memberSeq) {
        return ResponseEntity.ok(ApiResponse.ok("양도가 완료되었습니다.", transferService.completeTransfer(seq, memberSeq)));
    }
}
