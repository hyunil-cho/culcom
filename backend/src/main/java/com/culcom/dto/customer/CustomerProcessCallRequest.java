package com.culcom.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerProcessCallRequest {
    @NotNull
    private Long customerSeq;
    @NotBlank
    private String caller;
}
