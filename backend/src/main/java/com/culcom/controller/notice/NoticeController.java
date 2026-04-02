package com.culcom.controller.notice;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.notice.NoticeCreateRequest;
import com.culcom.dto.notice.NoticeDetailResponse;
import com.culcom.dto.notice.NoticeListResponse;
import com.culcom.dto.notice.NoticeUpdateRequest;
import com.culcom.entity.Notice;
import com.culcom.entity.enums.NoticeCategory;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.NoticeRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeRepository noticeRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<NoticeListResponse>>> list(
            HttpSession session,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "all") String filter,
            @RequestParam(required = false) String searchKeyword) {

        Long branchSeq = authService.getSessionBranchSeq(session);
        var pageable = PageRequest.of(page, size);

        Page<Notice> notices;
        boolean hasKeyword = searchKeyword != null && !searchKeyword.isBlank();
        boolean hasCategory = !"all".equals(filter);

        if (hasCategory && hasKeyword) {
            notices = noticeRepository.findByBranchSeqAndCategoryAndTitleContaining(
                    branchSeq, NoticeCategory.valueOf(filter), searchKeyword, pageable);
        } else if (hasCategory) {
            notices = noticeRepository.findByBranchSeqAndCategoryOrderByIsPinnedDescCreatedDateDesc(
                    branchSeq, NoticeCategory.valueOf(filter), pageable);
        } else if (hasKeyword) {
            notices = noticeRepository.findByBranchSeqAndTitleContaining(branchSeq, searchKeyword, pageable);
        } else {
            notices = noticeRepository.findByBranchSeqOrderByIsPinnedDescCreatedDateDesc(branchSeq, pageable);
        }

        Page<NoticeListResponse> result = notices.map(NoticeListResponse::from);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

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
            @RequestBody NoticeCreateRequest request, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);

        Notice notice = Notice.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .category(NoticeCategory.valueOf(request.getCategory()))
                .isPinned(request.getIsPinned() != null && request.getIsPinned())
                .createdBy(request.getCreatedBy())
                .eventStartDate(parseDate(request.getEventStartDate()))
                .eventEndDate(parseDate(request.getEventEndDate()))
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
                    notice.setEventStartDate(parseDate(request.getEventStartDate()));
                    notice.setEventEndDate(parseDate(request.getEventEndDate()));
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

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        return LocalDate.parse(dateStr);
    }
}
