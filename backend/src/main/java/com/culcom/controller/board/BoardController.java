package com.culcom.controller.board;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.board.BoardNoticeResponse;
import com.culcom.dto.board.BoardSessionResponse;
import com.culcom.entity.Notice;
import com.culcom.entity.enums.NoticeCategory;
import com.culcom.repository.NoticeRepository;
import com.culcom.service.BoardSessionService;
import com.culcom.service.BoardSessionService.BoardSessionData;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/board")
@RequiredArgsConstructor
public class BoardController {

    private final NoticeRepository noticeRepository;
    private final BoardSessionService boardSessionService;

    @GetMapping("/notices")
    public ResponseEntity<ApiResponse<Page<BoardNoticeResponse>>> getNotices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "all") String filter,
            @RequestParam(required = false) String q) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Notice> noticePage;

        boolean hasKeyword = q != null && !q.trim().isEmpty();
        boolean hasCategory = !"all".equals(filter);

        if (hasCategory && hasKeyword) {
            NoticeCategory category = NoticeCategory.valueOf(filter);
            noticePage = noticeRepository.findByIsActiveTrueAndCategoryAndTitleContainingOrderByIsPinnedDescCreatedDateDesc(category, q.trim(), pageable);
        } else if (hasCategory) {
            NoticeCategory category = NoticeCategory.valueOf(filter);
            noticePage = noticeRepository.findByIsActiveTrueAndCategoryOrderByIsPinnedDescCreatedDateDesc(category, pageable);
        } else if (hasKeyword) {
            noticePage = noticeRepository.findByIsActiveTrueAndTitleContainingOrderByIsPinnedDescCreatedDateDesc(q.trim(), pageable);
        } else {
            noticePage = noticeRepository.findByIsActiveTrueOrderByIsPinnedDescCreatedDateDesc(pageable);
        }

        Page<BoardNoticeResponse> responsePage = noticePage.map(BoardNoticeResponse::fromList);
        return ResponseEntity.ok(ApiResponse.ok(responsePage));
    }

    @GetMapping("/notices/{seq}")
    @Transactional
    public ResponseEntity<ApiResponse<BoardNoticeResponse>> getNoticeDetail(@PathVariable Long seq) {
        return noticeRepository.findById(seq)
                .filter(Notice::getIsActive)
                .map(notice -> {
                    notice.setViewCount(notice.getViewCount() + 1);
                    noticeRepository.save(notice);
                    return ResponseEntity.ok(ApiResponse.ok(BoardNoticeResponse.fromDetail(notice)));
                })
                .orElse(ResponseEntity.ok(ApiResponse.error("공지사항을 찾을 수 없습니다")));
    }

    @GetMapping("/session")
    public ResponseEntity<ApiResponse<BoardSessionResponse>> getSession(
            HttpServletRequest request, HttpServletResponse response) {
        BoardSessionData data = boardSessionService.getSession(request, response);

        BoardSessionResponse sessionResponse = BoardSessionResponse.builder()
                .isLoggedIn(data.isLoggedIn())
                .memberName(data.getMemberName())
                .memberSeq(data.getMemberSeq())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(sessionResponse));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse response) {
        boardSessionService.logout(response);
        return ResponseEntity.ok(ApiResponse.ok("로그아웃 완료", null));
    }
}
