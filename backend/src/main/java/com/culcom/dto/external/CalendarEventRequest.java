package com.culcom.dto.external;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CalendarEventRequest {
    @NotBlank
    private String customerName;
    @NotBlank
    private String phoneNumber;
    @NotBlank
    private String interviewDate;
    private String comment;
    private Integer duration;
    private String caller;
    private Integer callCount;
    private String commercialName;
    private String adSource;
}
