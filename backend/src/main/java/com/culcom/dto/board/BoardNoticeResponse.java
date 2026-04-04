package com.culcom.dto.board;

import com.culcom.entity.notice.Notice;
import com.culcom.entity.enums.NoticeCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.format.DateTimeFormatter;

@Getter
@AllArgsConstructor
@Builder
public class BoardNoticeResponse {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private Long seq;
    private String branchName;
    private String title;
    private String content;
    private NoticeCategory category;
    private String categoryClass;
    private Boolean isPinned;
    private Integer viewCount;
    private String eventStartDate;
    private String eventEndDate;
    private boolean hasEventDate;
    private String createdBy;
    private String createdDate;

    public static BoardNoticeResponse fromList(Notice n) {
        return BoardNoticeResponse.builder()
                .seq(n.getSeq())
                .branchName(n.getBranch().getBranchName())
                .title(n.getTitle())
                .content(null)
                .category(n.getCategory())
                .categoryClass(n.getCategory() == NoticeCategory.공지사항 ? "badge-notice" : "badge-event")
                .isPinned(n.getIsPinned())
                .viewCount(n.getViewCount())
                .eventStartDate(n.getEventStartDate() != null ? n.getEventStartDate().format(DATE_FORMATTER) : null)
                .eventEndDate(n.getEventEndDate() != null ? n.getEventEndDate().format(DATE_FORMATTER) : null)
                .hasEventDate(n.getEventStartDate() != null || n.getEventEndDate() != null)
                .createdBy(n.getCreatedBy())
                .createdDate(n.getCreatedDate() != null ? n.getCreatedDate().format(DATE_FORMATTER) : null)
                .build();
    }

    public static BoardNoticeResponse fromDetail(Notice n) {
        return BoardNoticeResponse.builder()
                .seq(n.getSeq())
                .branchName(n.getBranch().getBranchName())
                .title(n.getTitle())
                .content(n.getContent())
                .category(n.getCategory())
                .categoryClass(n.getCategory() == NoticeCategory.공지사항 ? "badge-notice" : "badge-event")
                .isPinned(n.getIsPinned())
                .viewCount(n.getViewCount())
                .eventStartDate(n.getEventStartDate() != null ? n.getEventStartDate().format(DATE_FORMATTER) : null)
                .eventEndDate(n.getEventEndDate() != null ? n.getEventEndDate().format(DATE_FORMATTER) : null)
                .hasEventDate(n.getEventStartDate() != null || n.getEventEndDate() != null)
                .createdBy(n.getCreatedBy())
                .createdDate(n.getCreatedDate() != null ? n.getCreatedDate().format(DATE_FORMATTER) : null)
                .build();
    }
}
