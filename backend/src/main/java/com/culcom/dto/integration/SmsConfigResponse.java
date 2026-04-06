package com.culcom.dto.integration;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SmsConfigResponse {
    private Long serviceId;
    private String serviceName;
    private String accountId;
    private String password;
    private List<String> senderPhones;
    private boolean active;
    private String updatedAt;
}
