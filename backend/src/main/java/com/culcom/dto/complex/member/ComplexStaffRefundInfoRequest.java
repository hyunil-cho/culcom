package com.culcom.dto.complex.member;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ComplexStaffRefundInfoRequest {
    private String depositAmount;
    private String refundableDeposit;
    private String nonRefundableDeposit;
    private String refundBank;
    private String refundAccount;
    private String refundAmount;
    private String paymentMethod;
}
