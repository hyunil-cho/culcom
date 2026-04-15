package com.culcom.dto.board;

import com.culcom.entity.board.BoardAccount;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BoardAccountResponse {
    private Long seq;
    private String email;
    private String name;
    private String phoneNumber;
    private String loginType;

    public static BoardAccountResponse from(BoardAccount account) {
        return BoardAccountResponse.builder()
                .seq(account.getSeq())
                .email(account.getEmail())
                .name(account.getName())
                .phoneNumber(account.getPhoneNumber())
                .loginType(account.getLoginType().name())
                .build();
    }
}
