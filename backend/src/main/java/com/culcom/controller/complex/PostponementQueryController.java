package com.culcom.controller.complex;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.postponement.PostponementResponse;
import com.culcom.mapper.PostponementQueryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/postponements")
@RequiredArgsConstructor
public class PostponementQueryController {

    private final PostponementQueryMapper postponementQueryMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<PostponementResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {

        Long branchSeq = principal.getSelectedBranchSeq();
        int offset = page * size;

        List<PostponementResponse> list = postponementQueryMapper.search(branchSeq, status, keyword, offset, size);
        int total = postponementQueryMapper.count(branchSeq, status, keyword);

        Page<PostponementResponse> result = new PageImpl<>(list, PageRequest.of(page, size), total);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
