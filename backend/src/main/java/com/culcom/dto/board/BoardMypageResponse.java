package com.culcom.dto.board;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class BoardMypageResponse {
    private String name;
    private String phoneNumber;
    private String createdDate;
    private String loginMethod;
}
