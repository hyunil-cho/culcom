package com.culcom.service;

import com.culcom.config.KakaoOAuthProperties;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.CustomerRepository;
import com.culcom.service.external.KakaoOAuthClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final KakaoOAuthProperties properties;
    private final ObjectMapper objectMapper;
    private final CustomerRepository customerRepository;
    private final BranchRepository branchRepository;
    private final KakaoOAuthClient kakaoOAuthClient;

    public String buildAuthUrl(String branchSeq) throws Exception {
        String state = generateState(branchSeq);
        String callbackUri = buildCallbackUri();

        return "https://kauth.kakao.com/oauth/authorize"
                + "?client_id=" + properties.getClientId()
                + "&redirect_uri=" + URLEncoder.encode(callbackUri, StandardCharsets.UTF_8)
                + "&response_type=code"
                + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8)
                + "&scope=name,phone_number";
    }

    public void validateState(String state) throws Exception {
        String json = new String(Base64.getUrlDecoder().decode(state), StandardCharsets.UTF_8);
        var node = objectMapper.readTree(json);

        if (!"board".equals(node.path("source").asText())) {
            throw new IllegalArgumentException("invalid_state");
        }

        long timestamp = node.path("timestamp").asLong();
        if (System.currentTimeMillis() - timestamp > 10 * 60 * 1000) {
            throw new IllegalArgumentException("state_expired");
        }
    }

    /** 외부 API 호출 위임 */
    public String exchangeToken(String code) throws Exception {
        return kakaoOAuthClient.exchangeToken(code);
    }

    /** 외부 API 호출 위임 */
    public KakaoUserInfo fetchUserInfo(String accessToken) throws Exception {
        return kakaoOAuthClient.fetchUserInfo(accessToken);
    }

    /** 외부 API 호출 위임 */
    public void unlinkUser(Long kakaoId) {
        kakaoOAuthClient.unlinkUser(kakaoId);
    }

    @Transactional
    public UpsertResult upsertCustomer(KakaoUserInfo info) {
        return customerRepository.findByKakaoId(info.getKakaoId())
                .map(existing -> {
                    existing.setName(info.getName());
                    existing.setPhoneNumber(info.getPhone());
                    return new UpsertResult(customerRepository.save(existing), false);
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
                    return new UpsertResult(created, true);
                });
    }

    public record UpsertResult(Customer customer, boolean isNew) {}

    private String generateState(String branchSeq) throws Exception {
        String json = objectMapper.writeValueAsString(Map.of(
                "source", "board",
                "branchSeq", branchSeq != null ? branchSeq : "",
                "timestamp", System.currentTimeMillis(),
                "random", UUID.randomUUID().toString()
        ));
        return Base64.getUrlEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private String buildCallbackUri() {
        URI base = URI.create(properties.getRedirectUri());
        return base.getScheme() + "://" + base.getAuthority() + "/api/public/kakao/callback";
    }

    @Getter
    @RequiredArgsConstructor
    public static class KakaoUserInfo {
        private final Long kakaoId;
        private final String name;
        private final String phone;
    }
}
