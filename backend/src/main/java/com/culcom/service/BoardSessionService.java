package com.culcom.service;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

@Service
@Slf4j
public class BoardSessionService {

    private static final String COOKIE_NAME = "board_session";
    private static final int MAX_AGE_SECONDS = 5 * 60; // 30분

    @Value("${board.session.secret:}")
    private String configuredSecret;

    private String secret;

    @PostConstruct
    void init() {
        secret = (configuredSecret != null && !configuredSecret.isEmpty())
                ? configuredSecret
                : UUID.randomUUID().toString();
    }

    public void login(HttpServletResponse response, Long memberSeq, String memberName) {
        String payload = memberSeq + "|" + memberName;
        String signed = payload + "|" + hmac(payload);
        String encoded = URLEncoder.encode(
                Base64.getUrlEncoder().encodeToString(signed.getBytes(StandardCharsets.UTF_8)),
                StandardCharsets.UTF_8);

        addCookie(response, encoded, MAX_AGE_SECONDS);
    }

    public void logout(HttpServletResponse response) {
        addCookie(response, "", 0);
    }

    /**
     * 세션 조회 + 자동 갱신.
     * 유효한 세션이면 쿠키 만료 시간을 리셋한다.
     * 카카오 로그인을 통해 로그인 한 경우, 대부분 화면을 바로 나가기 때문에, 서버에 세션을 저장하는 것은 위험함
     * 이 떄문에, 세션쿡키를 발급하고, 이 내부에 세션 정보를 넣어놓고, 이를 암호화하여 서버에서만 볼 수 있도록 함.
     */
    public BoardSessionData getSession(HttpServletRequest request, HttpServletResponse response) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return BoardSessionData.EMPTY;

        for (Cookie cookie : cookies) {
            if (!COOKIE_NAME.equals(cookie.getName())) continue;

            String value = cookie.getValue();
            if (value == null || value.isEmpty()) return BoardSessionData.EMPTY;

            try {
                String decoded = new String(
                        Base64.getUrlDecoder().decode(
                                URLDecoder.decode(value, StandardCharsets.UTF_8)),
                        StandardCharsets.UTF_8);

                String[] parts = decoded.split("\\|", 3);
                if (parts.length != 3) return BoardSessionData.EMPTY;

                String payload = parts[0] + "|" + parts[1];
                if (!hmac(payload).equals(parts[2])) {
                    log.warn("보드 세션 쿠키 서명 불일치");
                    return BoardSessionData.EMPTY;
                }

                Long memberSeq = Long.parseLong(parts[0]);
                String memberName = parts[1];

                // 접속 시마다 쿠키 만료 갱신
                addCookie(response, value, MAX_AGE_SECONDS);

                return new BoardSessionData(true, memberSeq, memberName);
            } catch (Exception e) {
                log.warn("보드 세션 쿠키 파싱 실패: {}", e.getMessage());
                return BoardSessionData.EMPTY;
            }
        }

        return BoardSessionData.EMPTY;
    }

    private void addCookie(HttpServletResponse response, String value, int maxAge) {
        Cookie cookie = new Cookie(COOKIE_NAME, value);
        cookie.setMaxAge(maxAge);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        response.addCookie(cookie);
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException("HMAC 계산 실패", e);
        }
    }

    @Getter
    public static class BoardSessionData {
        static final BoardSessionData EMPTY = new BoardSessionData(false, null, null);

        private final boolean loggedIn;
        private final Long memberSeq;
        private final String memberName;

        BoardSessionData(boolean loggedIn, Long memberSeq, String memberName) {
            this.loggedIn = loggedIn;
            this.memberSeq = memberSeq;
            this.memberName = memberName;
        }
    }
}
