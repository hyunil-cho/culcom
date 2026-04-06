package com.culcom.dto.complex.member;

import com.culcom.entity.complex.staff.ComplexStaffRefundInfo;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ComplexStaffRefundInfoResponse {
    private Long seq;
    private Long staffSeq;
    private String depositAmount;
    private String refundableDeposit;
    private String nonRefundableDeposit;
    private String refundBank;
    private String refundAccount;
    private String refundAmount;
    private String paymentMethod;

    public static ComplexStaffRefundInfoResponse from(ComplexStaffRefundInfo entity) {
        return ComplexStaffRefundInfoResponse.builder()
                .seq(entity.getSeq())
                .staffSeq(entity.getStaff().getSeq())
                .depositAmount(entity.getDepositAmount())
                .refundableDeposit(entity.getRefundableDeposit())
                .nonRefundableDeposit(entity.getNonRefundableDeposit())
                .refundBank(entity.getRefundBank())
                .refundAccount(entity.getRefundAccount())
                .refundAmount(entity.getRefundAmount())
                .paymentMethod(entity.getPaymentMethod())
                .build();
    }
}
