package com.culcom.config.security;

import com.culcom.entity.enums.UserRole;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

@Getter
public class CustomUserPrincipal implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private final Long userSeq;
    private final String userId;
    private final String name;
    private final UserRole role;
    @Setter
    private volatile Long selectedBranchSeq;

    public CustomUserPrincipal(Long userSeq, String userId, String name,
                               UserRole role, Long selectedBranchSeq) {
        this.userSeq = userSeq;
        this.userId = userId;
        this.name = name;
        this.role = role;
        this.selectedBranchSeq = selectedBranchSeq;
    }

}
