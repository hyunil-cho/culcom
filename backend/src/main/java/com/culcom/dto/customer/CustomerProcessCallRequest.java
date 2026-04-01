package com.culcom.dto.customer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerProcessCallRequest {
    private Long customerSeq;
    private String caller;
}
