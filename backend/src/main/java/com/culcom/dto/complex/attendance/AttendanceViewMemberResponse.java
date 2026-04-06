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
    private String status;
    private List<String> attendanceHistory;
}
