package com.culcom.controller.notice;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.notice.NoticeCreateRequest;
import com.culcom.dto.notice.NoticeDetailResponse;
import com.culcom.dto.notice.NoticeUpdateRequest;
import com.culcom.service.NoticeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<NoticeDetailResponse>> get(@PathVariable Long seq) {
        NoticeDetailResponse result = noticeService.get(seq);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<NoticeDetailResponse>> create(
            @Valid @RequestBody NoticeCreateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        NoticeDetailResponse result = noticeService.create(request, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("스터디시간이 등록되었습니다.", result));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<NoticeDetailResponse>> update(
            @PathVariable Long seq, @RequestBody NoticeUpdateRequest request) {
        NoticeDetailResponse result = noticeService.update(seq, request);
        return ResponseEntity.ok(ApiResponse.ok("스터디시간이 수정되었습니다.", result));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        noticeService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("스터디시간이 삭제되었습니다.", null));
    }
}
