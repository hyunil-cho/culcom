package com.culcom.dto.auth;

import com.culcom.entity.Branch;
import com.culcom.entity.UserInfo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long seq;
    private String userId;
    private String role;
    private List<BranchInfo> branches;
    private LocalDate createdDate;

    @Getter
    @AllArgsConstructor
    public static class BranchInfo {
        private Long seq;
        private String branchName;
    }

    public static UserResponse from(UserInfo user) {
        return UserResponse.builder()
                .seq(user.getSeq())
                .userId(user.getUserId())
                .role(user.getRole().name())
                .branches(user.getBranches().stream()
                        .map(b -> new BranchInfo(b.getSeq(), b.getBranchName()))
                        .toList())
                .createdDate(user.getCreatedDate())
                .build();
    }
}
