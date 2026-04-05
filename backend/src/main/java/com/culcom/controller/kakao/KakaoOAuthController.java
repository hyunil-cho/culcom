package com.culcom.controller.kakao;

import com.culcom.service.BoardSessionService;
import com.culcom.service.KakaoOAuthService;
import com.culcom.service.KakaoOAuthService.KakaoUserInfo;
import com.culcom.service.KakaoOAuthService.UpsertResult;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/public/kakao")
@RequiredArgsConstructor
@Slf4j
public class KakaoOAuthController {

    private final KakaoOAuthService kakaoOAuthService;
    private final BoardSessionService boardSessionService;

    @GetMapping("/login")
    public ResponseEntity<Void> login(@RequestParam(value = "state", required = false) String branchSeq) {
        try {
            String authUrl = kakaoOAuthService.buildAuthUrl(branchSeq);
            return redirect(authUrl);
        } catch (Exception e) {
            log.error("카카오 로그인 URL 생성 실패", e);
            return redirect("/board?error=login_failed");
        }
    }

    @GetMapping("/callback")
    public ResponseEntity<Void> callback(
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) {
        try {
            kakaoOAuthService.validateState(state);
            String accessToken = kakaoOAuthService.exchangeToken(code);
            KakaoUserInfo userInfo = kakaoOAuthService.fetchUserInfo(accessToken);

            UpsertResult result = kakaoOAuthService.upsertCustomer(userInfo);
            boardSessionService.login(response, result.customer().getSeq(), result.customer().getName());

            return redirect(result.isNew() ? "/kakao/success" : "/board");
        } catch (IllegalArgumentException e) {
            log.error("카카오 콜백 state 검증 실패: {}", e.getMessage());
            return redirect("/board?error=" + e.getMessage());
        } catch (Exception e) {
            log.error("카카오 OAuth 콜백 처리 실패", e);
            return redirect("/board?error=callback_failed");
        }
    }

    private ResponseEntity<Void> redirect(String path) {
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(path)).build();
    }
}
