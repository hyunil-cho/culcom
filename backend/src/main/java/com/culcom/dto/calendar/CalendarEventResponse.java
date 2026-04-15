package com.culcom.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class CalendarEventResponse {
    private Long seq;
    private String title;
    private String content;
    private String author;
    private String eventDate;
    private String startTime;
    private String endTime;
    private String createdDate;
    private String lastUpdateDate;
}
