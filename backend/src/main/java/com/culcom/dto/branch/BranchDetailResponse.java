package com.culcom.dto.branch;

import com.culcom.entity.Branch;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@AllArgsConstructor
@Builder
public class BranchDetailResponse {
    private Long seq;
    private String branchName;
    private String alias;
    private String branchManager;
    private String address;
    private String directions;
    private String createdBy;
    private LocalDate createdDate;
    private LocalDate lastUpdateDate;

    public static BranchDetailResponse from(Branch branch) {
        return BranchDetailResponse.builder()
                .seq(branch.getSeq())
                .branchName(branch.getBranchName())
                .alias(branch.getAlias())
                .branchManager(branch.getBranchManager())
                .address(branch.getAddress())
                .directions(branch.getDirections())
                .createdBy(branch.getCreatedBy().getUserId())
                .createdDate(branch.getCreatedDate())
                .lastUpdateDate(branch.getLastUpdateDate())
                .build();
    }
}
