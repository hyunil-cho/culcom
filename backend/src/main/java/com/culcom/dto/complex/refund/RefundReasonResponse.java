package com.culcom.dto.complex.refund;

import com.culcom.entity.complex.refund.ComplexRefundReason;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundReasonResponse {
    private Long seq;
    private String reason;
    private LocalDateTime createdDate;

    public static RefundReasonResponse from(ComplexRefundReason entity) {
        return RefundReasonResponse.builder()
                .seq(entity.getSeq())
                .reason(entity.getReason())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
