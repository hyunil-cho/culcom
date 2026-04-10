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

    @GetMapping
    public ResponseEntity<ApiResponse<List<TransferRequestResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(transferService.list()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TransferRequestResponse>> create(
            @Valid @RequestBody TransferCreateRequest req,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        return ResponseEntity.ok(ApiResponse.ok("양도 요청이 생성되었습니다.", transferService.create(req, branchSeq)));
    }

    @PutMapping("/{seq}/status")
    public ResponseEntity<ApiResponse<TransferRequestResponse>> updateStatus(
            @PathVariable Long seq, @RequestParam TransferStatus status) {
        return ResponseEntity.ok(ApiResponse.ok("양도 요청 상태가 변경되었습니다.", transferService.updateStatus(seq, status)));
    }

    @PostMapping("/{seq}/complete")
    public ResponseEntity<ApiResponse<TransferRequestResponse>> complete(
            @PathVariable Long seq, @RequestParam Long memberSeq) {
        return ResponseEntity.ok(ApiResponse.ok("양도가 완료되었습니다.", transferService.completeTransfer(seq, memberSeq)));
    }
}
