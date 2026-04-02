package com.culcom.dto.kakaosync;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class KakaoSyncUrlResponse {
    private String kakaoSyncUrl;
    private String branchName;
}