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
public class NoticeDetailResponse {
    private Long seq;
    private String branchName;
    private String title;
    private String content;
    private String category;
    private Boolean isPinned;
    private Boolean isActive;
    private Integer viewCount;
    private String createdBy;
    private String createdDate;
    private String lastUpdateDate;
    private String eventStartDate;
    private String eventEndDate;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public static NoticeDetailResponse from(Notice notice) {
        return NoticeDetailResponse.builder()
                .seq(notice.getSeq())
                .branchName(notice.getBranch() != null ? notice.getBranch().getBranchName() : "")
                .title(notice.getTitle())
                .content(notice.getContent())
                .category(notice.getCategory().name())
                .isPinned(notice.getIsPinned())
                .isActive(notice.getIsActive())
                .viewCount(notice.getViewCount())
                .createdBy(notice.getCreatedBy() != null ? notice.getCreatedBy() : "관리자")
                .createdDate(notice.getCreatedDate() != null ? notice.getCreatedDate().format(DATETIME_FMT) : "")
                .lastUpdateDate(notice.getLastUpdateDate() != null ? notice.getLastUpdateDate().format(DATETIME_FMT) : null)
                .eventStartDate(formatDate(notice.getEventStartDate()))
                .eventEndDate(formatDate(notice.getEventEndDate()))
                .build();
    }

    private static String formatDate(LocalDate date) {
        return date != null ? date.format(DATE_FMT) : null;
    }
}
