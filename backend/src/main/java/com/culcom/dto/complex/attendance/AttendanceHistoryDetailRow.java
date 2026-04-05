package com.culcom.dto.complex.attendance;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 회원/스태프 개인별 출석 히스토리 행 (페이징 조회용).
 */
@Getter
@Setter
@NoArgsConstructor
public class AttendanceHistoryDetailRow {
    private Long seq;
    private String attendanceDate;
    private String status;
    private String className;
    private String note;
}
