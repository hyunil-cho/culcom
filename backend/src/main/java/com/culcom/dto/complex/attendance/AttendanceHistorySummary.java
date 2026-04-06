package com.culcom.dto.complex.attendance;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 회원/스태프 출석 히스토리 요약 (출석·결석·기타 건수).
 */
@Getter
@Setter
@NoArgsConstructor
public class AttendanceHistorySummary {
    private int totalCount;
    private int presentCount;
    private int absentCount;
    private int postponeCount;
    private String startDate;
    private String endDate;
}