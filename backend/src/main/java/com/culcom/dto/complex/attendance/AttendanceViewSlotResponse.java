package com.culcom.dto.complex.attendance;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AttendanceViewSlotResponse {
    private Long timeSlotSeq;
    private String slotName;
    private List<AttendanceViewClassResponse> classes;
}
