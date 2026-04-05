package com.culcom.dto.branch;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BranchCreateRequest {
    @NotBlank
    private String branchName;
    private String alias;
    private String branchManager;
    private String address;
    private String directions;
}
