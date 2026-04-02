package com.culcom.dto.notice;

import com.culcom.entity.Notice;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Getter
@Builder
@AllArgsConstructor
public class NoticeListResponse {
    private Long seq;
    private String branchName;
    private String title;
    private String category;
    private Boolean isPinned;
    private Integer viewCount;
    private String createdBy;
    private String createdDate;
    private String eventStartDate;
    private String eventEndDate;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public static NoticeListResponse from(Notice notice) {
        return NoticeListResponse.builder()
                .seq(notice.getSeq())
                .branchName(notice.getBranch() != null ? notice.getBranch().getBranchName() : "")
                .title(notice.getTitle())
                .category(notice.getCategory().name())
                .isPinned(notice.getIsPinned())
                .viewCount(notice.getViewCount())
                .createdBy(notice.getCreatedBy() != null ? notice.getCreatedBy() : "관리자")
                .createdDate(notice.getCreatedDate() != null ? notice.getCreatedDate().format(DATE_FMT) : "")
                .eventStartDate(formatDate(notice.getEventStartDate()))
                .eventEndDate(formatDate(notice.getEventEndDate()))
                .build();
    }

    private static String formatDate(LocalDate date) {
        return date != null ? date.format(DATE_FMT) : null;
    }
}
