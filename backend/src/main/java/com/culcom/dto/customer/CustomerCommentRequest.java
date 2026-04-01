package com.culcom.dto.customer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerCommentRequest {
    private Long customerSeq;
    private String comment;
}
