package com.culcom.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "kakao.oauth")
@Getter @Setter
public class KakaoOAuthProperties {
    private String clientId;
    private String clientSecret;
    private String adminKey;
    private String redirectUri;
}
