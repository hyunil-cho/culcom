package com.culcom.dto.complex.member;

import com.culcom.entity.enums.StaffStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ComplexStaffRequest {
    private String name;
    private String phoneNumber;
    private String email;
    private String subject;
    private StaffStatus status;
    private LocalDate joinDate;
    private String comment;
    private String interviewer;
    private String paymentMethod;
}
