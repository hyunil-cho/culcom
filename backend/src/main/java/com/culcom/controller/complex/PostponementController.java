package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.PostponementCreateRequest;
import com.culcom.dto.complex.PostponementReasonRequest;
import com.culcom.dto.complex.PostponementReasonResponse;
import com.culcom.dto.complex.PostponementResponse;
import com.culcom.entity.ComplexPostponementReason;
import com.culcom.entity.ComplexPostponementRequest;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.ComplexPostponementReasonRepository;
import com.culcom.repository.ComplexPostponementRequestRepository;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

    @GetMapping
    public ResponseEntity<ApiResponse<Page<PostponementResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        Long branchSeq = principal.getSelectedBranchSeq();
        var pageable = PageRequest.of(page, size);
        boolean hasKeyword = keyword != null && !keyword.isBlank();
        boolean hasStatus = status != null && !status.isBlank();

        Page<ComplexPostponementRequest> result;
        if (hasKeyword && hasStatus) {
            result = postponementRepository.searchByBranchSeqAndStatus(branchSeq, RequestStatus.valueOf(status), keyword, pageable);
        } else if (hasKeyword) {
            result = postponementRepository.searchByBranchSeq(branchSeq, keyword, pageable);
        } else if (hasStatus) {
            result = postponementRepository.findByBranchSeqAndStatusOrderByCreatedDateDesc(branchSeq, RequestStatus.valueOf(status), pageable);
        } else {
            result = postponementRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq, pageable);
        }
        return ResponseEntity.ok(ApiResponse.ok(result.map(PostponementResponse::from)));
    }

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
