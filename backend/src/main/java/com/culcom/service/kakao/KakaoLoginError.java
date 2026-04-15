package com.culcom.service.kakao;

/**
 * 카카오 로그인 실패 시 URL 쿼리로 내보낼 에러 코드.
 * 프론트엔드는 이 코드를 기준으로 메시지를 결정한다.
 */
public enum KakaoLoginError {
    INVALID_STATE,
    EMAIL_CONFLICT,
    EXTERNAL_API,
    UNKNOWN;

    public String code() {
        return name().toLowerCase();
    }
}
