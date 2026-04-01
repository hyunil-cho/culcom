package com.culcom.dto.branch;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BranchCreateRequest {
    private String branchName;
    private String alias;
    private String branchManager;
    private String address;
    private String directions;
}
