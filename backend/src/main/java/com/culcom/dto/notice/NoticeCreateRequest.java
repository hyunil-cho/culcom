package com.culcom.dto.notice;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NoticeCreateRequest {
    private String title;
    private String content;
    private String category;
    private Boolean isPinned;
    private String createdBy;
    private String eventStartDate;
    private String eventEndDate;
}
