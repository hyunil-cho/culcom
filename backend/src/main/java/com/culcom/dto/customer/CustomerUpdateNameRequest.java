package com.culcom.dto.customer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerUpdateNameRequest {
    private Long customerSeq;
    private String name;
}
