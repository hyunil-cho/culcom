package com.culcom.dto.complex.member;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ComplexMemberMembershipRequest {
    private Long membershipSeq;
    private String startDate;
    private String expiryDate;
    private String price;
    private String depositAmount;
    private String paymentMethod;
    private String paymentDate;
    private String status;
}
