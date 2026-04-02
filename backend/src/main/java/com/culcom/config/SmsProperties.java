package com.culcom.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sms")
public class SmsProperties {
    private String apiBaseUrl = "https://www.mymunja.co.kr/Remote";
    private String smsEndpoint = "/RemoteSms.html";
    private String lmsEndpoint = "/RemoteMms.html";
    private String checkEndpoint = "/RemoteCheck.html";
    private int maxSmsBytes = 90;
}
