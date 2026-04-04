package com.culcom.controller.notice;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.notice.NoticeListResponse;
import com.culcom.mapper.NoticeQueryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeQueryController {

    private final NoticeQueryMapper noticeQueryMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<NoticeListResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "all") String filter,
            @RequestParam(required = false) String searchKeyword) {

        Long branchSeq = principal.getSelectedBranchSeq();
        int offset = page * size;

        List<NoticeListResponse> list = noticeQueryMapper.search(branchSeq, filter, searchKeyword, offset, size);
        int total = noticeQueryMapper.count(branchSeq, filter, searchKeyword);

        Page<NoticeListResponse> result = new PageImpl<>(list, PageRequest.of(page, size), total);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
