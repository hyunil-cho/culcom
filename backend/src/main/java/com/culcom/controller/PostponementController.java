package com.culcom.controller;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.ComplexPostponementRequest;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexPostponementReasonRepository;
import com.culcom.repository.ComplexPostponementRequestRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/postponements")
@RequiredArgsConstructor
public class PostponementController {

    private final ComplexPostponementRequestRepository postponementRepository;
    private final ComplexPostponementReasonRepository reasonRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ComplexPostponementRequest>>> list(
            HttpSession session,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        var pageable = PageRequest.of(page, size);

        Page<ComplexPostponementRequest> result;
        if (status != null && !status.isBlank()) {
            result = postponementRepository.findByBranchSeqAndStatusOrderByCreatedDateDesc(
                    branchSeq, RequestStatus.valueOf(status), pageable);
        } else {
            result = postponementRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq, pageable);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexPostponementRequest>> create(
            @RequestBody ComplexPostponementRequest request, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        branchRepository.findById(branchSeq).ifPresent(request::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("연기 요청 등록 완료", postponementRepository.save(request)));
    }

    @PutMapping("/{seq}/status")
    public ResponseEntity<ApiResponse<ComplexPostponementRequest>> updateStatus(
            @PathVariable Long seq,
            @RequestParam RequestStatus status,
            @RequestParam(required = false) String rejectReason) {
        return postponementRepository.findById(seq)
                .map(req -> {
                    req.setStatus(status);
                    if (status == RequestStatus.반려) {
                        req.setRejectReason(rejectReason);
                    }
                    return ResponseEntity.ok(ApiResponse.ok("상태 변경 완료", postponementRepository.save(req)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/reasons")
    public ResponseEntity<ApiResponse<List<?>>> reasons(HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        return ResponseEntity.ok(ApiResponse.ok(reasonRepository.findByBranchSeq(branchSeq)));
    }
}
