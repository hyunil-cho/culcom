package com.culcom.dto.complex.member;

import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.entity.enums.PaymentMethod;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MembershipPaymentResponse {
    private Long seq;
    private Long memberMembershipSeq;
    private Long amount;
    private LocalDateTime paidDate;
    private PaymentMethod method;
    private PaymentKind kind;
    private String note;
    private LocalDateTime createdDate;

    public static MembershipPaymentResponse from(MembershipPayment entity) {
        return MembershipPaymentResponse.builder()
                .seq(entity.getSeq())
                .memberMembershipSeq(entity.getMemberMembership().getSeq())
                .amount(entity.getAmount())
                .paidDate(entity.getPaidDate())
                .method(entity.getMethod())
                .kind(entity.getKind())
                .note(entity.getNote())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
