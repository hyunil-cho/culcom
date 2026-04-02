package com.culcom.dto.integration;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SmsSendRequest {
    @NotBlank
    private String senderPhone;
    @NotBlank
    private String receiverPhone;
    @NotBlank
    private String message;
    private String subject;
}
