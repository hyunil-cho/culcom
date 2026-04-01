package com.culcom.dto.customer;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class CustomerProcessCallResponse {
    private int callCount;
    private String lastUpdateDate;
}
