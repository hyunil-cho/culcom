package com.culcom.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "zapier")
public class ZapierProperties {
    /**
     * Zapier 웹훅 공유 시크릿. 요청 헤더 X-Webhook-Token 과 일치해야 한다.
     * 비어있으면 모든 요청이 거부된다.
     */
    private String secret = "";
}
