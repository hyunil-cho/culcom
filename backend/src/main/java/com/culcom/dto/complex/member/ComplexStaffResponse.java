package com.culcom.dto.complex.member;

import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexStaffInfo;
import com.culcom.entity.enums.StaffStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ComplexStaffResponse {
    private Long seq;
    private String name;
    private String phoneNumber;
    private String branchName;
    private StaffStatus status;
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdateDate;

    public static ComplexStaffResponse from(ComplexMember entity) {
        ComplexStaffInfo si = entity.getStaffInfo();
        return ComplexStaffResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .phoneNumber(entity.getPhoneNumber())
                .branchName(entity.getBranch() != null ? entity.getBranch().getBranchName() : null)
                .status(si != null ? si.getStatus() : null)
                .createdDate(entity.getCreatedDate())
                .lastUpdateDate(entity.getLastUpdateDate())
                .build();
    }
}
