package com.culcom.dto.integration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SmsConfigSaveRequest {
    @NotNull
    private Long serviceId;
    @NotBlank
    private String accountId;
    @NotBlank
    private String password;
    @NotBlank
    private String senderPhone;
    private boolean active;
}
