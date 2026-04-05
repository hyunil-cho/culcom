package com.culcom.controller.complex.staff;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.member.ComplexStaffRefundInfoRequest;
import com.culcom.dto.complex.member.ComplexStaffRefundInfoResponse;
import com.culcom.dto.complex.member.ComplexStaffRequest;
import com.culcom.dto.complex.member.ComplexStaffResponse;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.service.ComplexStaffService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/staffs")
@RequiredArgsConstructor
public class ComplexStaffController {

    private final ComplexStaffService complexStaffService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ComplexStaffResponse>>> list(@AuthenticationPrincipal CustomUserPrincipal principal) {
        List<ComplexStaffResponse> result = complexStaffService.list(principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexStaffResponse>> get(@PathVariable Long seq) {
        ComplexStaffResponse result = complexStaffService.get(seq);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexStaffResponse>> create(
            @RequestBody ComplexStaffRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        ComplexStaffResponse result = complexStaffService.create(req, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("스태프 추가 완료", result));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexStaffResponse>> update(
            @PathVariable Long seq, @RequestBody ComplexStaffRequest req) {
        ComplexStaffResponse result = complexStaffService.update(seq, req);
        return ResponseEntity.ok(ApiResponse.ok("스태프 수정 완료", result));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        complexStaffService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("스태프 삭제 완료", null));
    }

    // ── 환급 정보 ──

    @GetMapping("/{staffSeq}/refund")
    public ResponseEntity<ApiResponse<ComplexStaffRefundInfoResponse>> getRefundInfo(@PathVariable Long staffSeq) {
        ComplexStaffRefundInfoResponse result = complexStaffService.getRefundInfo(staffSeq);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/{staffSeq}/refund")
    public ResponseEntity<ApiResponse<ComplexStaffRefundInfoResponse>> createOrUpdateRefundInfo(
            @PathVariable Long staffSeq, @RequestBody ComplexStaffRefundInfoRequest req) {
        ComplexStaffRefundInfoResponse result = complexStaffService.saveRefundInfo(staffSeq, req);
        return ResponseEntity.ok(ApiResponse.ok("환급 정보 저장 완료", result));
    }

    @DeleteMapping("/{staffSeq}/refund")
    public ResponseEntity<ApiResponse<Void>> deleteRefundInfo(@PathVariable Long staffSeq) {
        complexStaffService.deleteRefundInfo(staffSeq);
        return ResponseEntity.ok(ApiResponse.ok("환급 정보 삭제 완료", null));
    }
}
