package com.culcom.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class CalendarReservationResponse {
    private Long seq;
    private Long customerSeq;
    private String interviewDate;
    private String customerName;
    private String customerPhone;
    private String caller;
    private String status;
    private String memo;
    private String createdDate;
    private String lastUpdateDate;
}