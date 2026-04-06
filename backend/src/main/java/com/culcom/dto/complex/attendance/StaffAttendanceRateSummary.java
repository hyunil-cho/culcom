package com.culcom.dto.complex.attendance;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 스태프별 출석율 요약 (최근 3개월).
 */
@Getter
@Setter
@NoArgsConstructor
public class StaffAttendanceRateSummary {
    private Long staffSeq;
    private int totalCount;
    private int presentCount;
}
