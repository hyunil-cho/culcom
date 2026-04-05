package com.culcom.service.external;

import com.culcom.service.KakaoOAuthService.KakaoUserInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("test")
public class KakaoOAuthClientMock implements KakaoOAuthClient {

    @Override
    public String exchangeToken(String code) {
        log.info("[Mock] 카카오 토큰 교환 — code: {}", code);
        return "mock-access-token-" + code;
    }

    @Override
    public KakaoUserInfo fetchUserInfo(String accessToken) {
        log.info("[Mock] 카카오 사용자 정보 조회 — token: {}", accessToken);
        return new KakaoUserInfo(99999L, "테스트 사용자", "01000000000");
    }

    @Override
    public void unlinkUser(Long kakaoId) {
        log.info("[Mock] 카카오 연결 해제 — kakaoId: {}", kakaoId);
    }
}
