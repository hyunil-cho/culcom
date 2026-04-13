package com.culcom.controller.complex.refund;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.ReasonDto;
import com.culcom.dto.complex.refund.RefundCreateRequest;
import com.culcom.dto.complex.refund.RefundResponse;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.service.RefundService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    @PostMapping
    public ResponseEntity<ApiResponse<RefundResponse>> create(
            @Valid @RequestBody RefundCreateRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        RefundResponse result = refundService.create(req, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("환불 요청 등록 완료", result));
    }

    @PutMapping("/{seq}/status")
    public ResponseEntity<ApiResponse<RefundResponse>> updateStatus(
            @PathVariable Long seq,
            @RequestParam RequestStatus status,
            @RequestParam(required = false) String rejectReason) {
        RefundResponse result = refundService.updateStatus(seq, status, rejectReason);
        return ResponseEntity.ok(ApiResponse.ok("상태 변경 완료", result));
    }

    @GetMapping("/reasons")
    public ResponseEntity<ApiResponse<List<ReasonDto.Response>>> reasons(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(refundService.reasons(principal.getSelectedBranchSeq())));
    }

    @PostMapping("/reasons")
    public ResponseEntity<ApiResponse<ReasonDto.Response>> addReason(
            @RequestBody ReasonDto.Request req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(refundService.addReason(req, principal.getSelectedBranchSeq())));
    }

    @DeleteMapping("/reasons/{seq}")
    public ResponseEntity<ApiResponse<Void>> deleteReason(@PathVariable Long seq) {
        refundService.deleteReason(seq);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
