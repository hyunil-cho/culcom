package com.culcom.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "kakao.sync")
@Getter @Setter
public class KakaoSyncProperties {
    private String baseUrl;
}