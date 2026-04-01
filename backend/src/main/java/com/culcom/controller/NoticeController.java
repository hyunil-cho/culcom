package com.culcom.controller;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.Notice;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.NoticeRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeRepository noticeRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Notice>>> list(
            HttpSession session,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        var pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(ApiResponse.ok(
                noticeRepository.findByBranchSeqOrderByIsPinnedDescCreatedDateDesc(branchSeq, pageable)));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<Notice>> get(@PathVariable Long seq) {
        return noticeRepository.findById(seq)
                .map(n -> ResponseEntity.ok(ApiResponse.ok(n)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Notice>> create(
            @RequestBody Notice notice, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        branchRepository.findById(branchSeq).ifPresent(notice::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("공지사항 추가 완료", noticeRepository.save(notice)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<Notice>> update(
            @PathVariable Long seq, @RequestBody Notice request) {
        return noticeRepository.findById(seq)
                .map(notice -> {
                    notice.setTitle(request.getTitle());
                    notice.setContent(request.getContent());
                    notice.setCategory(request.getCategory());
                    notice.setIsPinned(request.getIsPinned());
                    notice.setIsActive(request.getIsActive());
                    notice.setEventStartDate(request.getEventStartDate());
                    notice.setEventEndDate(request.getEventEndDate());
                    return ResponseEntity.ok(ApiResponse.ok("공지사항 수정 완료", noticeRepository.save(notice)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        noticeRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("공지사항 삭제 완료", null));
    }
}
