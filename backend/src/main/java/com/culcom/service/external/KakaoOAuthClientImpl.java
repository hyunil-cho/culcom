package com.culcom.service.external;

import com.culcom.config.KakaoOAuthProperties;
import com.culcom.service.KakaoOAuthService.KakaoUserInfo;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URI;

@Slf4j
@Component
@Profile("!test")
@RequiredArgsConstructor
public class KakaoOAuthClientImpl implements KakaoOAuthClient {

    private final KakaoOAuthProperties properties;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String exchangeToken(String code) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", properties.getClientId());
        params.add("client_secret", properties.getClientSecret());
        params.add("redirect_uri", buildCallbackUri());
        params.add("code", code);

        ResponseEntity<String> response = restTemplate.postForEntity(
                "https://kauth.kakao.com/oauth/token",
                new HttpEntity<>(params, headers), String.class);

        return objectMapper.readTree(response.getBody()).path("access_token").asText();
    }

    @Override
    public KakaoUserInfo fetchUserInfo(String accessToken) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        ResponseEntity<String> response = restTemplate.exchange(
                "https://kapi.kakao.com/v2/user/me", HttpMethod.GET,
                new HttpEntity<>(headers), String.class);

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode account = root.path("kakao_account");
        JsonNode props = root.path("properties");

        String name = account.path("name").asText(null);
        if (name == null || name.isEmpty()) name = props.path("nickname").asText(null);
        if (name == null || name.isEmpty()) name = "카카오 사용자";

        String phone = account.path("phone_number").asText("").replaceAll("[^0-9]", "");

        return new KakaoUserInfo(root.path("id").asLong(), name, phone);
    }

    @Override
    public void unlinkUser(Long kakaoId) {
        if (kakaoId == null || properties.getAdminKey() == null || properties.getAdminKey().isEmpty()) return;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set("Authorization", "KakaoAK " + properties.getAdminKey());

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("target_id_type", "user_id");
        params.add("target_id", String.valueOf(kakaoId));

        try {
            restTemplate.postForEntity("https://kapi.kakao.com/v1/user/unlink",
                    new HttpEntity<>(params, headers), String.class);
        } catch (Exception e) {
            log.error("카카오 연결 해제 실패 (kakaoId: {}): {}", kakaoId, e.getMessage());
        }
    }

    private String buildCallbackUri() {
        URI base = URI.create(properties.getRedirectUri());
        return base.getScheme() + "://" + base.getAuthority() + "/api/public/kakao/callback";
    }
}
