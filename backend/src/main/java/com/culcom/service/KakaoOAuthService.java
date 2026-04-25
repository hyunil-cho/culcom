package com.culcom.service;

import com.culcom.config.KakaoOAuthProperties;
import com.culcom.entity.board.BoardAccount;
import com.culcom.entity.board.enums.BoardLoginType;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.CustomerRepository;
import com.culcom.repository.board.BoardAccountRepository;
import com.culcom.service.external.KakaoOAuthClient;
import com.culcom.service.kakao.KakaoAuthException;
import com.culcom.service.kakao.KakaoLoginResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class KakaoOAuthService {

    private static final long STATE_TTL_MILLIS = 10 * 60 * 1000L;

    private final KakaoOAuthProperties properties;
    private final ObjectMapper objectMapper;
    private final CustomerRepository customerRepository;
    private final BranchRepository branchRepository;
    private final BoardAccountRepository boardAccountRepository;
    private final KakaoOAuthClient kakaoOAuthClient;
    private final BoardSessionService boardSessionService;
    private final SmsService smsService;

    @Value("${kakao.oauth.state-secret:}")
    private String configuredStateSecret;

    private String stateSecret;

    @PostConstruct
    void initStateSecret() {
        stateSecret = (configuredStateSecret != null && !configuredStateSecret.isEmpty())
                ? configuredStateSecret
                : UUID.randomUUID().toString();
    }

    public String buildAuthUrl(String branchSeq) {
        String state = generateSignedState(branchSeq);
        String callbackUri = properties.getRedirectUri();

        return "https://kauth.kakao.com/oauth/authorize"
                + "?client_id=" + properties.getClientId()
                + "&redirect_uri=" + URLEncoder.encode(callbackUri, StandardCharsets.UTF_8)
                + "&response_type=code"
                + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8)
                + "&scope=name,phone_number,account_email";
    }

    /**
     * 카카오 로그인 콜백의 전체 유스케이스.
     * state 검증 → 토큰 교환 → 사용자 정보 조회 → Customer/BoardAccount upsert → 세션 쿠키 발급.
     */
    public KakaoLoginResult handleCallback(String code, String state, HttpServletResponse response) {
        validateState(state);

        String accessToken = exchangeTokenOrFail(code);
        KakaoUserInfo userInfo = fetchUserInfoOrFail(accessToken);

        UpsertResult upsert = upsertCustomer(userInfo);
        Customer customer = upsert.customer();

        boardSessionService.login(response, customer.getSeq(), customer.getName());

        log.info("카카오 로그인 성공 kakaoId={} customerSeq={} isNew={}",
                userInfo.getKakaoId(), customer.getSeq(), upsert.isNew());

        return new KakaoLoginResult(
                customer.getSeq(),
                customer.getName(),
                userInfo.getKakaoId(),
                upsert.isNew()
        );
    }

    /** 외부 API 호출 위임 (고객 삭제 시 unlink 호출용) */
    public void unlinkUser(Long kakaoId) {
        kakaoOAuthClient.unlinkUser(kakaoId);
    }

    @Transactional
    protected UpsertResult upsertCustomer(KakaoUserInfo info) {
        String normalizedEmail = info.getEmail() != null ? info.getEmail().trim().toLowerCase() : null;

        if (normalizedEmail != null && !normalizedEmail.isEmpty()) {
            boardAccountRepository.findByEmail(normalizedEmail).ifPresent(existing -> {
                if (existing.getLoginType() == BoardLoginType.LOCAL) {
                    throw new KakaoAuthException.EmailConflict(normalizedEmail);
                }
            });
        }

        return customerRepository.findByKakaoId(info.getKakaoId())
                .map(existing -> {
                    existing.setName(info.getName());
                    existing.setPhoneNumber(info.getPhone());
                    Customer saved = customerRepository.save(existing);
                    upsertKakaoBoardAccount(saved, info, normalizedEmail);
                    return new UpsertResult(saved, false);
                })
                .orElseGet(() -> {
                    Branch defaultBranch = branchRepository.findById(99999L)
                            .orElse(branchRepository.findAll().stream().findFirst().orElse(null));

                    Customer created = customerRepository.save(Customer.builder()
                            .kakaoId(info.getKakaoId())
                            .name(info.getName())
                            .phoneNumber(info.getPhone())
                            .branch(defaultBranch)
                            .adSource("카카오")
                            .status(CustomerStatus.신규)
                            .build());
                    upsertKakaoBoardAccount(created, info, normalizedEmail);

                    if (defaultBranch != null) {
                        String smsWarning = smsService.sendEventSmsIfConfigured(
                                defaultBranch.getSeq(), SmsEventType.고객등록,
                                created.getName(), created.getPhoneNumber());
                        if (smsWarning != null) {
                            log.warn("카카오 신규 고객등록 SMS 경고: branchSeq={}, customerSeq={}, message={}",
                                    defaultBranch.getSeq(), created.getSeq(), smsWarning);
                        }
                    }

                    return new UpsertResult(created, true);
                });
    }

    private void upsertKakaoBoardAccount(Customer customer, KakaoUserInfo info, String normalizedEmail) {
        if (normalizedEmail == null || normalizedEmail.isEmpty()) {
            return;
        }
        boardAccountRepository.findByEmail(normalizedEmail)
                .map(existing -> {
                    existing.setName(info.getName());
                    existing.setPhoneNumber(info.getPhone());
                    existing.setCustomer(customer);
                    return boardAccountRepository.save(existing);
                })
                .orElseGet(() -> boardAccountRepository.save(BoardAccount.builder()
                        .email(normalizedEmail)
                        .passwordHash(null)
                        .name(info.getName())
                        .phoneNumber(info.getPhone())
                        .loginType(BoardLoginType.KAKAO)
                        .customer(customer)
                        .build()));
    }

    private String exchangeTokenOrFail(String code) {
        try {
            return kakaoOAuthClient.exchangeToken(code);
        } catch (Exception e) {
            throw new KakaoAuthException.ExternalApi("토큰 교환 실패", e);
        }
    }

    private KakaoUserInfo fetchUserInfoOrFail(String accessToken) {
        try {
            return kakaoOAuthClient.fetchUserInfo(accessToken);
        } catch (Exception e) {
            throw new KakaoAuthException.ExternalApi("사용자 정보 조회 실패", e);
        }
    }

    void validateState(String state) {
        if (state == null || state.isEmpty()) {
            throw new KakaoAuthException.InvalidState("state_empty");
        }

        String[] parts = state.split("\\.", 2);
        if (parts.length != 2) {
            throw new KakaoAuthException.InvalidState("state_malformed");
        }

        String payload = parts[0];
        String providedSig = parts[1];
        if (!constantTimeEquals(hmac(payload), providedSig)) {
            throw new KakaoAuthException.InvalidState("state_signature_mismatch");
        }

        try {
            String json = new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8);
            var node = objectMapper.readTree(json);

            if (!"board".equals(node.path("source").asText())) {
                throw new KakaoAuthException.InvalidState("state_source_invalid");
            }
            long timestamp = node.path("timestamp").asLong();
            if (System.currentTimeMillis() - timestamp > STATE_TTL_MILLIS) {
                throw new KakaoAuthException.InvalidState("state_expired");
            }
        } catch (KakaoAuthException e) {
            throw e;
        } catch (Exception e) {
            throw new KakaoAuthException.InvalidState("state_decode_failed");
        }
    }

    private String generateSignedState(String branchSeq) {
        try {
            String json = objectMapper.writeValueAsString(Map.of(
                    "source", "board",
                    "branchSeq", branchSeq != null ? branchSeq : "",
                    "timestamp", System.currentTimeMillis(),
                    "random", UUID.randomUUID().toString()
            ));
            String payload = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(json.getBytes(StandardCharsets.UTF_8));
            return payload + "." + hmac(payload);
        } catch (Exception e) {
            throw new KakaoAuthException.ExternalApi("state 생성 실패", e);
        }
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(stateSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC 계산 실패", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) return false;
        int r = 0;
        for (int i = 0; i < a.length(); i++) r |= a.charAt(i) ^ b.charAt(i);
        return r == 0;
    }

    @Getter
    @RequiredArgsConstructor
    public static class KakaoUserInfo {
        private final Long kakaoId;
        private final String name;
        private final String phone;
        private final String email;
    }

    public record UpsertResult(Customer customer, boolean isNew) {}

    /** 정적 유틸: 서비스 외부에서 리다이렉트 URL 을 만들 때 사용. */
    public static String buildCallbackUri(String redirectUri) {
        URI base = URI.create(redirectUri);
        return base.getScheme() + "://" + base.getAuthority() + "/api/public/kakao/callback";
    }
}
