package com.culcom.dto.customer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerReservationRequest {
    private Long customerSeq;
    private String caller;
    private String interviewDate;
}
