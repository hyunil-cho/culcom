package com.culcom.dto.notice;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NoticeCreateRequest {
    @NotBlank
    private String title;
    @NotBlank
    private String content;
    @NotBlank
    private String category;
    private Boolean isPinned;
    private String createdBy;
    private String eventStartDate;
    private String eventEndDate;
}
