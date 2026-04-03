package com.culcom.dto.complex;

import com.culcom.entity.ComplexMemberAttendance;
import com.culcom.entity.enums.AttendanceStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class AttendanceResponse {
    private Long seq;
    private Long memberMembershipSeq;
    private Long classSeq;
    private LocalDate attendanceDate;
    private AttendanceStatus status;
    private String note;
    private LocalDateTime createdDate;

    public static AttendanceResponse from(ComplexMemberAttendance entity) {
        return AttendanceResponse.builder()
                .seq(entity.getSeq())
                .memberMembershipSeq(entity.getMemberMembership().getSeq())
                .classSeq(entity.getComplexClass() != null ? entity.getComplexClass().getSeq() : null)
                .attendanceDate(entity.getAttendanceDate())
                .status(entity.getStatus())
                .note(entity.getNote())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
