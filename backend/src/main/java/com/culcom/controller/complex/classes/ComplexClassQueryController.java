package com.culcom.controller.complex.classes;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.classes.ComplexClassResponse;
import com.culcom.mapper.ComplexClassQueryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/classes")
@RequiredArgsConstructor
public class ComplexClassQueryController {

    private final ComplexClassQueryMapper complexClassQueryMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ComplexClassResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword) {

        Long branchSeq = principal.getSelectedBranchSeq();
        int offset = page * size;

        List<ComplexClassResponse> list = complexClassQueryMapper.search(branchSeq, keyword, offset, size);
        int total = complexClassQueryMapper.count(branchSeq, keyword);

        Page<ComplexClassResponse> result = new PageImpl<>(list, PageRequest.of(page, size), total);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
