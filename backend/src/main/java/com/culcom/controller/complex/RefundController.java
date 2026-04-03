package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.RefundCreateRequest;
import com.culcom.dto.complex.RefundResponse;
import com.culcom.entity.ComplexRefundRequest;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.ComplexRefundRequestRepository;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    private final ComplexMemberRepository complexMemberRepository;
    private final ComplexMemberMembershipRepository complexMemberMembershipRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<RefundResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        Long branchSeq = principal.getSelectedBranchSeq();
        var pageable = PageRequest.of(page, size);
        boolean hasKeyword = keyword != null && !keyword.isBlank();
        boolean hasStatus = status != null && !status.isBlank();

        Page<ComplexRefundRequest> result;
        if (hasKeyword && hasStatus) {
            result = refundRepository.searchByBranchSeqAndStatus(branchSeq, RequestStatus.valueOf(status), keyword, pageable);
        } else if (hasKeyword) {
            result = refundRepository.searchByBranchSeq(branchSeq, keyword, pageable);
        } else if (hasStatus) {
            result = refundRepository.findByBranchSeqAndStatusOrderByCreatedDateDesc(branchSeq, RequestStatus.valueOf(status), pageable);
        } else {
            result = refundRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq, pageable);
        }
        return ResponseEntity.ok(ApiResponse.ok(result.map(RefundResponse::from)));
    }

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
