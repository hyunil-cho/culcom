package com.culcom.dto.auth;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.auth.UserInfo;
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
    private String name;
    private String phone;
    private LocalDate createdDate;

    public static UserResponse from(UserInfo user) {
        return UserResponse.builder()
                .seq(user.getSeq())
                .userId(user.getUserId())
                .role(user.getRole().name())
                .name(user.getName())
                .phone(user.getPhone())
                .createdDate(user.getCreatedDate())
                .build();
    }
}
