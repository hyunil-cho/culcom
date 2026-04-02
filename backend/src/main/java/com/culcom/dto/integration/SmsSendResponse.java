package com.culcom.dto.integration;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SmsSendResponse {
    private boolean success;
    private String message;
    private String code;
    private String nums;
    private String cols;
    private String msgType;
}
