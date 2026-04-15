package com.culcom.controller.kakao;

import com.culcom.service.KakaoOAuthService;
import com.culcom.service.kakao.BoardRoutes;
import com.culcom.service.kakao.KakaoAuthException;
import com.culcom.service.kakao.KakaoLoginError;
import com.culcom.service.kakao.KakaoLoginResult;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/api/public/kakao")
@RequiredArgsConstructor
@Slf4j
public class KakaoOAuthController {

    private final KakaoOAuthService kakaoOAuthService;

    @GetMapping("/login")
    public ResponseEntity<Void> login(
            @RequestParam(value = "state", required = false) String branchSeq) {
        try {
            return redirect(kakaoOAuthService.buildAuthUrl(branchSeq));
        } catch (Exception e) {
            log.error("카카오 로그인 URL 생성 실패", e);
            return redirectWithError(BoardRoutes.BOARD_HOME, KakaoLoginError.UNKNOWN);
        }
    }

    @GetMapping("/callback")
    public ResponseEntity<Void> callback(
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) {
        try {
            KakaoLoginResult result = kakaoOAuthService.handleCallback(code, state, response);
            return redirect(result.redirectPath());
        } catch (KakaoAuthException e) {
            log.warn("카카오 콜백 실패 error={} reason={}", e.getError(), e.getMessage());
            return redirectWithError(targetForError(e.getError()), e.getError());
        } catch (Exception e) {
            log.error("카카오 콜백 처리 중 예상치 못한 오류", e);
            return redirectWithError(BoardRoutes.BOARD_HOME, KakaoLoginError.UNKNOWN);
        }
    }

    private String targetForError(KakaoLoginError error) {
        return error == KakaoLoginError.EMAIL_CONFLICT
                ? BoardRoutes.BOARD_LOGIN
                : BoardRoutes.BOARD_HOME;
    }

    private ResponseEntity<Void> redirect(String path) {
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(path)).build();
    }

    private ResponseEntity<Void> redirectWithError(String path, KakaoLoginError error) {
        String url = UriComponentsBuilder.fromUriString(path)
                .queryParam("error", error.code())
                .build()
                .encode()
                .toUriString();
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(url)).build();
    }
}
