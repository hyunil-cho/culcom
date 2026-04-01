package com.culcom.dto.customer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerCreateRequest {
    private String name;
    private String phoneNumber;
    private String comment;
    private String commercialName;
    private String adSource;
    private String status;
}
