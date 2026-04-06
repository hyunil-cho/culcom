package com.culcom.dto.complex.member;

import com.culcom.entity.complex.member.ComplexStaffInfo;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ComplexStaffRefundInfoResponse {
    private Long seq;
    private Long memberSeq;
    private String depositAmount;
    private String refundableDeposit;
    private String nonRefundableDeposit;
    private String refundBank;
    private String refundAccount;
    private String refundAmount;
    private String paymentMethod;

    public static ComplexStaffRefundInfoResponse from(ComplexStaffInfo entity) {
        return ComplexStaffRefundInfoResponse.builder()
                .seq(entity.getSeq())
                .memberSeq(entity.getMember().getSeq())
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
