package com.culcom.dto.customer;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerSeqRequest {
    @NotNull
    private Long customerSeq;
}
