package com.culcom.dto.complex.refund;

import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.RequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundResponse {
    private Long seq;
    private Long memberSeq;
    private Long memberMembershipSeq;
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

    /** SMS 자동발송 경고 메시지 (정상 발송/미설정 시 null) */
    @Setter
    private String smsWarning;

    public static RefundResponse from(ComplexRefundRequest entity) {
        return RefundResponse.builder()
                .seq(entity.getSeq())
                .memberSeq(entity.getMember() != null ? entity.getMember().getSeq() : null)
                .memberMembershipSeq(entity.getMemberMembership() != null ? entity.getMemberMembership().getSeq() : null)
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
