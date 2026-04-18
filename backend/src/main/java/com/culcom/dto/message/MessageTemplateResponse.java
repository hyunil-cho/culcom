package com.culcom.dto.message;

import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.message.MessageTemplate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class MessageTemplateResponse {

    private Long seq;
    private String templateName;
    private String description;
    private String messageContext;
    private Boolean isDefault;
    private Boolean isActive;
    private SmsEventType eventType;
    private String createdDate;
    private String lastUpdateDate;

    public static MessageTemplateResponse from(MessageTemplate entity) {
        return MessageTemplateResponse.builder()
                .seq(entity.getSeq())
                .templateName(entity.getTemplateName())
                .description(entity.getDescription())
                .messageContext(entity.getMessageContext())
                .isDefault(entity.getIsDefault())
                .isActive(entity.getIsActive())
                .eventType(entity.getEventType())
                .createdDate(entity.getCreatedDate() != null ? entity.getCreatedDate().toString() : null)
                .lastUpdateDate(entity.getLastUpdateDate() != null ? entity.getLastUpdateDate().toString() : null)
                .build();
    }
}
