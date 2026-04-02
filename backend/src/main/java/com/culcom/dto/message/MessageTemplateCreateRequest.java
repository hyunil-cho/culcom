package com.culcom.dto.message;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MessageTemplateCreateRequest {
    private String templateName;
    private String description;
    private String messageContext;
    private Boolean isActive;
}
