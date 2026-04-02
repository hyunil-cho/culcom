package com.culcom.dto.integration;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class BranchIntegrationSummary {
    private Long branchSeq;
    private String branchName;
    private String accountId;
    private List<String> senderPhones;
    private boolean active;
}
