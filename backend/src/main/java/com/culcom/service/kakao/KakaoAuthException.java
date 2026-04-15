package com.culcom.service.kakao;

/**
 * 카카오 OAuth 처리 중 발생하는 도메인 예외의 베이스.
 * 컨트롤러는 이 타입을 catch 하여 {@link KakaoLoginError} 로 분기한다.
 */
public abstract class KakaoAuthException extends RuntimeException {

    private final KakaoLoginError error;

    protected KakaoAuthException(KakaoLoginError error, String message) {
        super(message);
        this.error = error;
    }

    protected KakaoAuthException(KakaoLoginError error, String message, Throwable cause) {
        super(message, cause);
        this.error = error;
    }

    public KakaoLoginError getError() {
        return error;
    }

    public static class InvalidState extends KakaoAuthException {
        public InvalidState(String reason) {
            super(KakaoLoginError.INVALID_STATE, reason);
        }
    }

    public static class EmailConflict extends KakaoAuthException {
        public EmailConflict(String email) {
            super(KakaoLoginError.EMAIL_CONFLICT, "local account already uses email: " + email);
        }
    }

    public static class ExternalApi extends KakaoAuthException {
        public ExternalApi(String message, Throwable cause) {
            super(KakaoLoginError.EXTERNAL_API, message, cause);
        }
    }
}
