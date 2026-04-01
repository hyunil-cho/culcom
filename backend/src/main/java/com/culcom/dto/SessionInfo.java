package com.culcom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class SessionInfo {
    private Long userSeq;
    private String userId;
    private Long selectedBranchSeq;
    private String selectedBranchName;
}
