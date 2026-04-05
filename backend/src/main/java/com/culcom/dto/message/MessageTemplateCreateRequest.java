package com.culcom.dto.message;

import jakarta.validation.constraints.NotBlank;
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
}
