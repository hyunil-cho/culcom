package com.culcom.dto.settings;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReservationSmsConfigRequest {
    private Long templateSeq;
    private String senderNumber;
    private Boolean autoSend;
}