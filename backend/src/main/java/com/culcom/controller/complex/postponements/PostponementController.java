package com.culcom.controller.complex.postponements;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.postponement.PostponementCreateRequest;
import com.culcom.dto.complex.postponement.PostponementReasonRequest;
import com.culcom.dto.complex.postponement.PostponementReasonResponse;
import com.culcom.dto.complex.postponement.PostponementResponse;
import com.culcom.entity.complex.postponement.ComplexPostponementReason;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.ComplexPostponementReasonRepository;
import com.culcom.repository.ComplexPostponementRequestRepository;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/complex/postponements")
@RequiredArgsConstructor
public class PostponementController {

    private final ComplexPostponementRequestRepository postponementRepository;
    private final ComplexPostponementReasonRepository reasonRepository;
    private final BranchRepository branchRepository;
    private final ComplexMemberRepository complexMemberRepository;
    private final ComplexMemberMembershipRepository complexMemberMembershipRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<PostponementResponse>> create(
            @RequestBody PostponementCreateRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        ComplexPostponementRequest entity = ComplexPostponementRequest.builder()
                .memberName(req.getMemberName())
                .phoneNumber(req.getPhoneNumber())
                .timeSlot(req.getTimeSlot())
                .currentClass(req.getCurrentClass())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .reason(req.getReason())
                .build();
        if (req.getMemberSeq() != null) {
            entity.setMember(complexMemberRepository.getReferenceById(req.getMemberSeq()));
        }
        if (req.getMemberMembershipSeq() != null) {
            entity.setMemberMembership(complexMemberMembershipRepository.getReferenceById(req.getMemberMembershipSeq()));
        }
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("연기 요청 등록 완료", PostponementResponse.from(postponementRepository.save(entity))));
    }

    @PutMapping("/{seq}/status")
    public ResponseEntity<ApiResponse<PostponementResponse>> updateStatus(
            @PathVariable Long seq,
            @RequestParam RequestStatus status,
            @RequestParam(required = false) String rejectReason) {
        return postponementRepository.findById(seq)
                .map(req -> {
                    req.setStatus(status);
                    if (status == RequestStatus.반려) {
                        req.setRejectReason(rejectReason);
                    }
                    return ResponseEntity.ok(ApiResponse.ok("상태 변경 완료", PostponementResponse.from(postponementRepository.save(req))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/reasons")
    public ResponseEntity<ApiResponse<List<PostponementReasonResponse>>> reasons(@AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        List<PostponementReasonResponse> responses = reasonRepository.findByBranchSeq(branchSeq).stream()
                .map(PostponementReasonResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }

    @PostMapping("/reasons")
    public ResponseEntity<ApiResponse<PostponementReasonResponse>> addReason(
            @RequestBody PostponementReasonRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        ComplexPostponementReason entity = ComplexPostponementReason.builder()
                .reason(req.getReason())
                .build();
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("연기사유 추가 완료", PostponementReasonResponse.from(reasonRepository.save(entity))));
    }

    @DeleteMapping("/reasons/{seq}")
    public ResponseEntity<ApiResponse<Void>> deleteReason(@PathVariable Long seq) {
        reasonRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("연기사유 삭제 완료", null));
    }
}
