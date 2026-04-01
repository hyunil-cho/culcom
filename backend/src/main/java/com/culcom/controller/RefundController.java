package com.culcom.controller;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.ComplexRefundRequest;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexRefundRequestRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/complex/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final ComplexRefundRequestRepository refundRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ComplexRefundRequest>>> list(
            HttpSession session,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        var pageable = PageRequest.of(page, size);

        Page<ComplexRefundRequest> result;
        if (status != null && !status.isBlank()) {
            result = refundRepository.findByBranchSeqAndStatusOrderByCreatedDateDesc(
                    branchSeq, RequestStatus.valueOf(status), pageable);
        } else {
            result = refundRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq, pageable);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexRefundRequest>> create(
            @RequestBody ComplexRefundRequest request, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        branchRepository.findById(branchSeq).ifPresent(request::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("환불 요청 등록 완료", refundRepository.save(request)));
    }

    @PutMapping("/{seq}/status")
    public ResponseEntity<ApiResponse<ComplexRefundRequest>> updateStatus(
            @PathVariable Long seq,
            @RequestParam RequestStatus status,
            @RequestParam(required = false) String rejectReason) {
        return refundRepository.findById(seq)
                .map(req -> {
                    req.setStatus(status);
                    if (status == RequestStatus.반려) {
                        req.setRejectReason(rejectReason);
                    }
                    return ResponseEntity.ok(ApiResponse.ok("상태 변경 완료", refundRepository.save(req)));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
