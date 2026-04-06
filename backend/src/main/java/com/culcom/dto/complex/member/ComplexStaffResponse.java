package com.culcom.dto.complex.member;

import com.culcom.entity.complex.staff.ComplexStaff;
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
    private String branchName;
    private String email;
    private String subject;
    private StaffStatus status;
    private LocalDate joinDate;
    private String comment;
    private String interviewer;
    private String paymentMethod;
    private String bio;
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdateDate;

    public static ComplexStaffResponse from(ComplexStaff entity) {
        return ComplexStaffResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .phoneNumber(entity.getPhoneNumber())
                .branchName(entity.getBranch() != null ? entity.getBranch().getBranchName() : null)
                .email(entity.getEmail())
                .subject(entity.getSubject())
                .status(entity.getStatus())
                .joinDate(entity.getJoinDate())
                .comment(entity.getComment())
                .interviewer(entity.getInterviewer())
                .paymentMethod(entity.getPaymentMethod())
                .bio(entity.getBio())
                .createdDate(entity.getCreatedDate())
                .lastUpdateDate(entity.getLastUpdateDate())
                .build();
    }
}
