package com.culcom.dto.message;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MessageTemplateResolveRequest {

    private String customerName;
    private String customerPhone;
    private String interviewDate;
}
