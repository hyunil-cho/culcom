package com.culcom.dto.customer;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerCreateRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String phoneNumber;
    private String comment;
    private String commercialName;
    private String adSource;
    private String interviewer;
    private String status;
}
