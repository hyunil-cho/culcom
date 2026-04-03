package com.culcom.dto.complex;

import com.culcom.entity.enums.AttendanceStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class AttendanceRequest {
    private Long memberMembershipSeq;
    private Long classSeq;
    private LocalDate attendanceDate;
    private AttendanceStatus status;
    private String note;
}
