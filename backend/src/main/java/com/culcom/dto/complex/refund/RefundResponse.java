package com.culcom.dto.complex.refund;

import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.RequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
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
    private RequestStatus status;
    private String adminMessage;
    private LocalDateTime createdDate;

    // 멤버십 사용 내역
    private LocalDate startDate;
    private LocalDate expiryDate;
    private Integer totalCount;
    private Integer usedCount;
    private Integer postponeUsed;

    public static RefundResponse from(ComplexRefundRequest entity) {
        return RefundResponse.builder()
                .seq(entity.getSeq())
                .memberName(entity.getMemberName())
                .phoneNumber(entity.getPhoneNumber())
                .membershipName(entity.getMembershipName())
                .price(entity.getPrice())
                .reason(entity.getReason())
                .status(entity.getStatus())
                .adminMessage(entity.getAdminMessage())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
