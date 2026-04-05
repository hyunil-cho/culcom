package com.culcom.dto.branch;

import com.culcom.entity.branch.Branch;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

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
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdateDate;

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
