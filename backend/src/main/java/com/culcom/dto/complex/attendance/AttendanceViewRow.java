package com.culcom.dto.complex.attendance;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

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
    private String daysOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;

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
    /** 활성 멤버십 없음 (스태프 제외). 출석 체크 불가. */
    private boolean noMembership;
    private String status;
    /** 위 status가 유래된 attendance 행의 날짜. 7일 이내 마지막 기록일 수 있음. 기록 없으면 null. */
    private LocalDate attendanceDate;

    // 상세 뷰 전용
    private String level;
    private String info;
    private LocalDate joinDate;
    private LocalDate expiryDate;
    private Integer totalCount;
    private Integer usedCount;
    private String membershipName;
}
