package com.culcom.dto.complex.member;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class OutstandingItemResponse {
    private Long memberSeq;
    private String memberName;
    private String phoneNumber;
    private Long memberMembershipSeq;
    private String membershipName;
    private Long price;
    private Long paidAmount;
    private Long outstanding;
    private LocalDateTime lastPaidDate;
    /** 마지막 납부일로부터 경과 일수. 납부 이력 없으면 createdDate 기준. */
    private Long daysSinceLastPaid;
    private String paymentStatus;
}
