package com.culcom.controller.complex.refund;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.refund.RefundCreateRequest;
import com.culcom.dto.complex.refund.RefundResponse;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.ComplexRefundRequestRepository;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/complex/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final ComplexRefundRequestRepository refundRepository;
    private final BranchRepository branchRepository;
    private final ComplexMemberRepository complexMemberRepository;
    private final ComplexMemberMembershipRepository complexMemberMembershipRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<RefundResponse>> create(
            @RequestBody RefundCreateRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        ComplexRefundRequest entity = ComplexRefundRequest.builder()
                .memberName(req.getMemberName())
                .phoneNumber(req.getPhoneNumber())
                .membershipName(req.getMembershipName())
                .price(req.getPrice())
                .reason(req.getReason())
                .bankName(req.getBankName())
                .accountNumber(req.getAccountNumber())
                .accountHolder(req.getAccountHolder())
                .build();
        if (req.getMemberSeq() != null) {
            entity.setMember(complexMemberRepository.getReferenceById(req.getMemberSeq()));
        }
        if (req.getMemberMembershipSeq() != null) {
            entity.setMemberMembership(complexMemberMembershipRepository.getReferenceById(req.getMemberMembershipSeq()));
        }
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("환불 요청 등록 완료", RefundResponse.from(refundRepository.save(entity))));
    }

    @PutMapping("/{seq}/status")
    public ResponseEntity<ApiResponse<RefundResponse>> updateStatus(
            @PathVariable Long seq,
            @RequestParam RequestStatus status,
            @RequestParam(required = false) String rejectReason) {
        return refundRepository.findById(seq)
                .map(req -> {
                    req.setStatus(status);
                    if (status == RequestStatus.반려) {
                        req.setRejectReason(rejectReason);
                    }
                    return ResponseEntity.ok(ApiResponse.ok("상태 변경 완료", RefundResponse.from(refundRepository.save(req))));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
