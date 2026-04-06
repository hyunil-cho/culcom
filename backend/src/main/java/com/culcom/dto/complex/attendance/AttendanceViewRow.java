package com.culcom.dto.complex.attendance;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * MyBatis 쿼리 결과를 담는 플랫 DTO.
 * attendanceView / attendanceDetail 쿼리에서 공통 사용.
 */
@Getter
@Setter
@NoArgsConstructor
public class AttendanceViewRow {
    // 시간대
    private Long timeSlotSeq;
    private String slotName;

    // 수업
    private Long classSeq;
    private String className;
    private Integer capacity;

    // 회원/스태프 공통
    private Long memberSeq;
    private String name;
    private String phoneNumber;
    private boolean staff;
    private boolean postponed;
    private String status;

    // 상세 뷰 전용
    private String level;
    private String info;
    private LocalDate joinDate;
    private LocalDate expiryDate;
    private Integer totalCount;
    private Integer usedCount;
    private String membershipName;
}
