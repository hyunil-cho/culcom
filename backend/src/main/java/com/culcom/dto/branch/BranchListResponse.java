package com.culcom.dto.branch;

import com.culcom.entity.branch.Branch;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
@Builder
public class BranchListResponse {
    private Long seq;
    private String branchName;
    private String alias;
    private String branchManager;
    private String createdBy;
    private LocalDateTime createdDate;

    public static BranchListResponse from(Branch branch) {
        return BranchListResponse.builder()
                .seq(branch.getSeq())
                .branchName(branch.getBranchName())
                .alias(branch.getAlias())
                .branchManager(branch.getBranchManager())
                .createdBy(branch.getCreatedBy().getUserId())
                .createdDate(branch.getCreatedDate())
                .build();
    }
}
