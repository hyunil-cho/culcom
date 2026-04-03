package com.culcom.dto.complex;

import com.culcom.entity.ComplexStaff;
import com.culcom.entity.enums.StaffStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class ComplexStaffResponse {
    private Long seq;
    private String name;
    private String phoneNumber;
    private String email;
    private String subject;
    private StaffStatus status;
    private LocalDate joinDate;
    private String comment;
    private String interviewer;
    private String paymentMethod;
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdateDate;

    public static ComplexStaffResponse from(ComplexStaff entity) {
        return ComplexStaffResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .phoneNumber(entity.getPhoneNumber())
                .email(entity.getEmail())
                .subject(entity.getSubject())
                .status(entity.getStatus())
                .joinDate(entity.getJoinDate())
                .comment(entity.getComment())
                .interviewer(entity.getInterviewer())
                .paymentMethod(entity.getPaymentMethod())
                .createdDate(entity.getCreatedDate())
                .lastUpdateDate(entity.getLastUpdateDate())
                .build();
    }
}
