package com.culcom.dto.auth;

import com.culcom.entity.auth.UserInfo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long seq;
    private String userId;
    private String role;
    private String name;
    private String phone;
    private LocalDateTime createdDate;
    private Boolean requirePasswordChange;
    private List<Long> branchSeqs;

    public static UserResponse from(UserInfo user) {
        return from(user, List.of());
    }

    public static UserResponse from(UserInfo user, List<Long> branchSeqs) {
        return UserResponse.builder()
                .seq(user.getSeq())
                .userId(user.getUserId())
                .role(user.getRole().name())
                .name(user.getName())
                .phone(user.getPhone())
                .createdDate(user.getCreatedDate())
                .requirePasswordChange(Boolean.TRUE.equals(user.getRequirePasswordChange()))
                .branchSeqs(branchSeqs)
                .build();
    }
}
