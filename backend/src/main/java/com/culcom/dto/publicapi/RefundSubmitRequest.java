package com.culcom.dto.publicapi;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefundSubmitRequest {
    private Long branchSeq;
    private Long memberSeq;
    private Long memberMembershipSeq;
    private String memberName;
    private String phoneNumber;
    private String membershipName;
    private String price;
    private String reason;
}
