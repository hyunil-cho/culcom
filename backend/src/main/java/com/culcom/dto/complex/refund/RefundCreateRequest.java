package com.culcom.dto.complex.refund;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefundCreateRequest {
    private Long memberSeq;
    private Long memberMembershipSeq;
    private String memberName;
    private String phoneNumber;
    private String membershipName;
    private String price;
    private String reason;
    private String bankName;
    private String accountNumber;
    private String accountHolder;
}
