package com.culcom.dto.complex.attendance;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 상세 뷰의 최근 출석기록 행.
 */
@Getter
@Setter
@NoArgsConstructor
public class AttendanceHistoryRow {
    private Long classSeq;
    private Long memberSeq;
    private String status;
}
