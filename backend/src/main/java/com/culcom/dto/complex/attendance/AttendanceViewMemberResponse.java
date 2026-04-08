package com.culcom.dto.complex.attendance;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class AttendanceViewMemberResponse {
    private Long memberSeq;
    private String name;
    private String phoneNumber;
    private String level;
    private String info;
    private LocalDate joinDate;
    private LocalDate expiryDate;
    private Integer totalCount;
    private Integer usedCount;
    private String membershipName;
    private boolean staff;
    private boolean postponed;
    private boolean noMembership;
    private String status;
    /** status 기록의 실제 날짜 (오늘이 아닐 수 있음 — 최근 7일 이내). null이면 기록 없음. */
    private LocalDate attendanceDate;
    private List<String> attendanceHistory;
}
