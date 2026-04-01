package com.culcom.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class UserCreateRequest {
    @NotBlank
    private String userId;
    @NotBlank
    private String password;
    private List<Long> branchSeqs;
}
