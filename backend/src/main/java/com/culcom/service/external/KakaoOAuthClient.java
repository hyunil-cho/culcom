package com.culcom.service.external;

import com.culcom.service.KakaoOAuthService.KakaoUserInfo;

/**
 * 카카오 OAuth 외부 API 호출 인터페이스.
 * 실제 구현체와 테스트 Mock 구현체를 프로필로 전환.
 */
public interface KakaoOAuthClient {

    /** OAuth code → access token 교환 */
    String exchangeToken(String code) throws Exception;

    /** access token → 사용자 정보 조회 */
    KakaoUserInfo fetchUserInfo(String accessToken) throws Exception;

    /** 카카오 계정 연결 해제 */
    void unlinkUser(Long kakaoId);
}
