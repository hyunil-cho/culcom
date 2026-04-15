package com.culcom.controller.complex.refund;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.refund.RefundSurveyResponse;
import com.culcom.mapper.RefundSurveyQueryMapper;
import com.culcom.service.RefundSurveyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/refund-surveys")
@RequiredArgsConstructor
public class RefundSurveyController {

    private final RefundSurveyQueryMapper refundSurveyQueryMapper;
    private final RefundSurveyService refundSurveyService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<RefundSurveyResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword) {

        Long branchSeq = principal.getSelectedBranchSeq();
        int offset = page * size;

        List<RefundSurveyResponse> list = refundSurveyQueryMapper.search(branchSeq, keyword, offset, size);
        int total = refundSurveyQueryMapper.count(branchSeq, keyword);

        Page<RefundSurveyResponse> result = new PageImpl<>(list, PageRequest.of(page, size), total);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<RefundSurveyResponse>> detail(@PathVariable Long seq) {
        return ResponseEntity.ok(ApiResponse.ok(refundSurveyService.getDetail(seq)));
    }

    @GetMapping("/by-refund/{refundRequestSeq}")
    public ResponseEntity<ApiResponse<RefundSurveyResponse>> byRefund(@PathVariable Long refundRequestSeq) {
        return ResponseEntity.ok(ApiResponse.ok(
                refundSurveyService.getByRefundRequest(refundRequestSeq).orElse(null)
        ));
    }
}
