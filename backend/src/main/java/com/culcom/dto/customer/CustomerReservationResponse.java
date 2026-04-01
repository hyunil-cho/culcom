package com.culcom.dto.customer;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class CustomerReservationResponse {
    private Long reservationId;
    private Long customerSeq;
    private String interviewDate;
}
