package com.culcom.dto.settings;

import com.culcom.entity.settings.SmsEventConfig;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SmsEventConfigResponse {
    private Long seq;
    private String eventType;
    private Long templateSeq;
    private String templateName;
    private String senderNumber;
    private Boolean autoSend;

    public static SmsEventConfigResponse from(SmsEventConfig config) {
        return SmsEventConfigResponse.builder()
                .seq(config.getSeq())
                .eventType(config.getEventType().name())
                .templateSeq(config.getTemplate().getSeq())
                .templateName(config.getTemplate().getTemplateName())
                .senderNumber(config.getSenderNumber())
                .autoSend(config.getAutoSend())
                .build();
    }
}
