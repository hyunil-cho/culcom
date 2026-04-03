package com.culcom.dto.complex;

import com.culcom.entity.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class ComplexMemberMembershipResponse {
    private Long seq;
    private Long memberSeq;
    private Long membershipSeq;
    private String membershipName;
    private LocalDate startDate;
    private LocalDate expiryDate;
    private Integer totalCount;
    private Integer usedCount;
    private Integer postponeTotal;
    private Integer postponeUsed;
    private String price;
    private String depositAmount;
    private String paymentMethod;
    private LocalDateTime paymentDate;
    private MembershipStatus status;
    private LocalDateTime createdDate;

    public static ComplexMemberMembershipResponse from(ComplexMemberMembership entity) {
        return ComplexMemberMembershipResponse.builder()
                .seq(entity.getSeq())
                .memberSeq(entity.getMember().getSeq())
                .membershipSeq(entity.getMembership().getSeq())
                .membershipName(entity.getMembership().getName())
                .startDate(entity.getStartDate())
                .expiryDate(entity.getExpiryDate())
                .totalCount(entity.getTotalCount())
                .usedCount(entity.getUsedCount())
                .postponeTotal(entity.getPostponeTotal())
                .postponeUsed(entity.getPostponeUsed())
                .price(entity.getPrice())
                .depositAmount(entity.getDepositAmount())
                .paymentMethod(entity.getPaymentMethod())
                .paymentDate(entity.getPaymentDate())
                .status(entity.getStatus())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
