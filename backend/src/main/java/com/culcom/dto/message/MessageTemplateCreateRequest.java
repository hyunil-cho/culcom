package com.culcom.dto.message;

import com.culcom.entity.enums.SmsEventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MessageTemplateCreateRequest {
    @NotBlank
    private String templateName;
    private String description;
    @NotBlank
    private String messageContext;
    private Boolean isActive;
    @NotNull
    private SmsEventType eventType;
}
