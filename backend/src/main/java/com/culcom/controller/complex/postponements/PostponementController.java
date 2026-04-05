package com.culcom.controller.complex.postponements;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.postponement.PostponementCreateRequest;
import com.culcom.dto.complex.postponement.PostponementReasonRequest;
import com.culcom.dto.complex.postponement.PostponementReasonResponse;
import com.culcom.dto.complex.postponement.PostponementResponse;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.service.PostponementService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/postponements")
@RequiredArgsConstructor
public class PostponementController {

    private final PostponementService postponementService;

    @PostMapping
    public ResponseEntity<ApiResponse<PostponementResponse>> create(
            @Valid @RequestBody PostponementCreateRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        PostponementResponse result = postponementService.create(req, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("연기 요청 등록 완료", result));
    }

    @PutMapping("/{seq}/status")
    public ResponseEntity<ApiResponse<PostponementResponse>> updateStatus(
            @PathVariable Long seq,
            @RequestParam RequestStatus status,
            @RequestParam(required = false) String rejectReason) {
        PostponementResponse result = postponementService.updateStatus(seq, status, rejectReason);
        return ResponseEntity.ok(ApiResponse.ok("상태 변경 완료", result));
    }

    @GetMapping("/reasons")
    public ResponseEntity<ApiResponse<List<PostponementReasonResponse>>> reasons(@AuthenticationPrincipal CustomUserPrincipal principal) {
        List<PostponementReasonResponse> result = postponementService.reasons(principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/reasons")
    public ResponseEntity<ApiResponse<PostponementReasonResponse>> addReason(
            @RequestBody PostponementReasonRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        PostponementReasonResponse result = postponementService.addReason(req, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("연기사유 추가 완료", result));
    }

    @DeleteMapping("/reasons/{seq}")
    public ResponseEntity<ApiResponse<Void>> deleteReason(@PathVariable Long seq) {
        postponementService.deleteReason(seq);
        return ResponseEntity.ok(ApiResponse.ok("연기사유 삭제 완료", null));
    }
}
