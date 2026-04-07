package com.culcom.controller.complex.member;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.member.OutstandingItemResponse;
import com.culcom.service.OutstandingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/complex/outstanding")
@RequiredArgsConstructor
public class OutstandingController {

    private final OutstandingService outstandingService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OutstandingItemResponse>>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "OUTSTANDING_DESC") OutstandingService.SortKey sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Page<OutstandingItemResponse> result = outstandingService.list(
                principal.getSelectedBranchSeq(), keyword, sort, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
