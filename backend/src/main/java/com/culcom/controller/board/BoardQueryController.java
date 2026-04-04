package com.culcom.controller.board;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.notice.NoticeListResponse;
import com.culcom.mapper.NoticeQueryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/board")
@RequiredArgsConstructor
public class BoardQueryController {

    private final NoticeQueryMapper noticeQueryMapper;

    @GetMapping("/notices")
    public ResponseEntity<ApiResponse<Page<NoticeListResponse>>> getNotices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "all") String filter,
            @RequestParam(required = false) String q) {

        int offset = page * size;
        String keyword = q != null ? q.trim() : null;

        List<NoticeListResponse> list = noticeQueryMapper.searchPublic(filter, keyword, offset, size);
        int total = noticeQueryMapper.countPublic(filter, keyword);

        Page<NoticeListResponse> result = new PageImpl<>(list, PageRequest.of(page, size), total);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
