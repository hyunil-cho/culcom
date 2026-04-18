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
    @NotBlank
    private String name;
    @NotBlank
    private String phone;

    /**
     * STAFF 생성/수정 시 담당 지점 목록.
     * BRANCH_MANAGER가 STAFF에게 지정한다. ROOT가 BRANCH_MANAGER를 생성할 때는 무시.
     */
    private List<Long> branchSeqs;
}
