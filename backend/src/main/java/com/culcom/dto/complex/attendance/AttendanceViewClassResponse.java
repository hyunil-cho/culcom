package com.culcom.dto.complex.attendance;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AttendanceViewClassResponse {
    private Long classSeq;
    private String name;
    private Integer capacity;
    private List<AttendanceViewMemberResponse> members;
}
