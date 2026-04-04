package com.culcom.dto.settings;

import com.culcom.entity.reservation.ReservationSmsConfig;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReservationSmsConfigResponse {
    private Long seq;
    private Long templateSeq;
    private String templateName;
    private String senderNumber;
    private Boolean autoSend;

    public static ReservationSmsConfigResponse from(ReservationSmsConfig config) {
        return ReservationSmsConfigResponse.builder()
                .seq(config.getSeq())
                .templateSeq(config.getTemplate().getSeq())
                .templateName(config.getTemplate().getTemplateName())
                .senderNumber(config.getSenderNumber())
                .autoSend(config.getAutoSend())
                .build();
    }
}