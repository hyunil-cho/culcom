package com.culcom.controller.complex.refund;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.refund.RefundResponse;
import com.culcom.mapper.RefundQueryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/refunds")
@RequiredArgsConstructor
public class RefundQueryController {

    private final RefundQueryMapper refundQueryMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<RefundResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {

        Long branchSeq = principal.getSelectedBranchSeq();
        int offset = page * size;

        List<RefundResponse> list = refundQueryMapper.search(branchSeq, status, keyword, offset, size);
        int total = refundQueryMapper.count(branchSeq, status, keyword);

        Page<RefundResponse> result = new PageImpl<>(list, PageRequest.of(page, size), total);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
