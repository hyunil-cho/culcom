package com.culcom.dto.complex.attendance;

import com.culcom.entity.enums.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class AttendanceRequest {
    @NotNull
    private Long memberMembershipSeq;
    @NotNull
    private Long classSeq;
    @NotNull
    private LocalDate attendanceDate;
    @NotNull
    private AttendanceStatus status;
    private String note;
}
