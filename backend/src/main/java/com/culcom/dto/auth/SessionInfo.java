package com.culcom.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class SessionInfo {
    private Long userSeq;
    private String userId;
    private String name;
    private String role;
    private Long selectedBranchSeq;
    private String selectedBranchName;
}
