package com.culcom.controller.notice;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.notice.NoticeCreateRequest;
import com.culcom.dto.notice.NoticeDetailResponse;
import com.culcom.dto.notice.NoticeListResponse;
import com.culcom.dto.notice.NoticeUpdateRequest;
import com.culcom.entity.notice.Notice;
import com.culcom.entity.enums.NoticeCategory;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.culcom.util.DateTimeUtils;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeRepository noticeRepository;
    private final BranchRepository branchRepository;

    @GetMapping("/{seq}")
    @Transactional
    public ResponseEntity<ApiResponse<NoticeDetailResponse>> get(@PathVariable Long seq) {
        return noticeRepository.findById(seq)
                .map(notice -> {
                    noticeRepository.incrementViewCount(seq);
                    notice.setViewCount(notice.getViewCount() + 1);
                    return ResponseEntity.ok(ApiResponse.ok(NoticeDetailResponse.from(notice)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<NoticeDetailResponse>> create(
            @RequestBody NoticeCreateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();

        Notice notice = Notice.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .category(NoticeCategory.valueOf(request.getCategory()))
                .isPinned(request.getIsPinned() != null && request.getIsPinned())
                .createdBy(request.getCreatedBy())
                .eventStartDate(DateTimeUtils.parseDate(request.getEventStartDate()))
                .eventEndDate(DateTimeUtils.parseDate(request.getEventEndDate()))
                .branch(branchRepository.findById(branchSeq).orElseThrow(
                        () -> new RuntimeException("지점을 찾을 수 없습니다.")))
                .build();

        Notice saved = noticeRepository.save(notice);
        return ResponseEntity.ok(ApiResponse.ok("공지사항이 등록되었습니다.", NoticeDetailResponse.from(saved)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<NoticeDetailResponse>> update(
            @PathVariable Long seq, @RequestBody NoticeUpdateRequest request) {
        return noticeRepository.findById(seq)
                .map(notice -> {
                    notice.setTitle(request.getTitle());
                    notice.setContent(request.getContent());
                    notice.setCategory(NoticeCategory.valueOf(request.getCategory()));
                    notice.setIsPinned(request.getIsPinned() != null && request.getIsPinned());
                    notice.setEventStartDate(DateTimeUtils.parseDate(request.getEventStartDate()));
                    notice.setEventEndDate(DateTimeUtils.parseDate(request.getEventEndDate()));
                    notice.setLastUpdateDate(LocalDateTime.now());
                    Notice saved = noticeRepository.save(notice);
                    return ResponseEntity.ok(ApiResponse.ok("공지사항이 수정되었습니다.", NoticeDetailResponse.from(saved)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        noticeRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("공지사항이 삭제되었습니다.", null));
    }

}
