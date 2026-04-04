package com.culcom.dto.settings;

import com.culcom.entity.message.MessageTemplate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MessageTemplateSimpleResponse {
    private Long seq;
    private String templateName;

    public static MessageTemplateSimpleResponse from(MessageTemplate template) {
        return MessageTemplateSimpleResponse.builder()
                .seq(template.getSeq())
                .templateName(template.getTemplateName())
                .build();
    }
}