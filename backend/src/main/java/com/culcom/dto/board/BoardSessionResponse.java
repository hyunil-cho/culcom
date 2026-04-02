package com.culcom.dto.board;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class BoardSessionResponse {
    private boolean isLoggedIn;
    private String memberName;
    private Long memberSeq;
}
