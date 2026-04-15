package com.culcom.service.kakao;

/**
 * 카카오 로그인 콜백 처리의 최종 결과.
 * 컨트롤러는 이 객체만 보고 리다이렉트 경로를 결정한다.
 */
public record KakaoLoginResult(
        Long customerSeq,
        String customerName,
        Long kakaoId,
        boolean isNew
) {
    public String redirectPath() {
        return isNew ? BoardRoutes.KAKAO_SUCCESS : BoardRoutes.BOARD_HOME;
    }
}
