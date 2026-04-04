package com.culcom.dto.complex.refund;

import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.RequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundResponse {
    private Long seq;
    private String memberName;
    private String phoneNumber;
    private String membershipName;
    private String price;
    private String reason;
    private String bankName;
    private String accountNumber;
    private String accountHolder;
    private RequestStatus status;
    private String rejectReason;
    private LocalDateTime createdDate;

    public static RefundResponse from(ComplexRefundRequest entity) {
        return RefundResponse.builder()
                .seq(entity.getSeq())
                .memberName(entity.getMemberName())
                .phoneNumber(entity.getPhoneNumber())
                .membershipName(entity.getMembershipName())
                .price(entity.getPrice())
                .reason(entity.getReason())
                .bankName(entity.getBankName())
                .accountNumber(entity.getAccountNumber())
                .accountHolder(entity.getAccountHolder())
                .status(entity.getStatus())
                .rejectReason(entity.getRejectReason())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
