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
    private StaffStatus status;
    private LocalDate joinDate;
    private String interviewer;
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdateDate;

    public static ComplexStaffResponse from(ComplexStaff entity) {
        return ComplexStaffResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .phoneNumber(entity.getPhoneNumber())
                .branchName(entity.getBranch() != null ? entity.getBranch().getBranchName() : null)
                .status(entity.getStatus())
                .joinDate(entity.getJoinDate())
                .interviewer(entity.getInterviewer())
                .createdDate(entity.getCreatedDate())
                .lastUpdateDate(entity.getLastUpdateDate())
                .build();
    }
}
