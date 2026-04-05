package com.culcom.dto.customer;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerCommentRequest {
    @NotNull
    private Long customerSeq;
    private String comment;
}
