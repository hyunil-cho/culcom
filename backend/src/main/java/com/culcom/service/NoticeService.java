package com.culcom.service;

import com.culcom.dto.notice.NoticeCreateRequest;
import com.culcom.dto.notice.NoticeDetailResponse;
import com.culcom.dto.notice.NoticeUpdateRequest;
import com.culcom.entity.enums.NoticeCategory;
import com.culcom.entity.notice.Notice;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.NoticeRepository;
import com.culcom.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final BranchRepository branchRepository;

    @Transactional
    public NoticeDetailResponse get(Long seq) {
        Notice notice = noticeRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("공지사항"));
        noticeRepository.incrementViewCount(seq);
        notice.setViewCount(notice.getViewCount() + 1);
        return NoticeDetailResponse.from(notice);
    }

    public NoticeDetailResponse create(NoticeCreateRequest request, Long branchSeq) {
        Notice notice = Notice.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .category(NoticeCategory.valueOf(request.getCategory()))
                .isPinned(request.getIsPinned() != null && request.getIsPinned())
                .createdBy(request.getCreatedBy())
                .eventStartDate(DateTimeUtils.parseDate(request.getEventStartDate()))
                .eventEndDate(DateTimeUtils.parseDate(request.getEventEndDate()))
                .branch(branchRepository.findById(branchSeq).orElseThrow(
                        () -> new EntityNotFoundException("지점")))
                .build();

        Notice saved = noticeRepository.save(notice);
        return NoticeDetailResponse.from(saved);
    }

    public NoticeDetailResponse update(Long seq, NoticeUpdateRequest request) {
        Notice notice = noticeRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("공지사항"));
        notice.setTitle(request.getTitle());
        notice.setContent(request.getContent());
        notice.setCategory(NoticeCategory.valueOf(request.getCategory()));
        notice.setIsPinned(request.getIsPinned() != null && request.getIsPinned());
        notice.setEventStartDate(DateTimeUtils.parseDate(request.getEventStartDate()));
        notice.setEventEndDate(DateTimeUtils.parseDate(request.getEventEndDate()));
        Notice saved = noticeRepository.save(notice);
        return NoticeDetailResponse.from(saved);
    }

    public void delete(Long seq) {
        noticeRepository.deleteById(seq);
    }

    @Transactional
    public com.culcom.dto.board.BoardNoticeResponse getBoardNoticeDetail(Long seq) {
        return noticeRepository.findById(seq)
                .filter(com.culcom.entity.notice.Notice::getIsActive)
                .map(notice -> {
                    notice.setViewCount(notice.getViewCount() + 1);
                    noticeRepository.save(notice);
                    return com.culcom.dto.board.BoardNoticeResponse.fromDetail(notice);
                })
                .orElse(null);
    }
}
