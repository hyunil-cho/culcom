package com.culcom.dto.complex.member;

import com.culcom.entity.enums.PaymentKind;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class MembershipPaymentRequest {
    /** 양수=납부, 음수=환불정정 */
    @NotNull
    private Long amount;

    @NotNull
    private PaymentKind kind;

    private String method;

    private LocalDateTime paidDate;

    private String note;

    private CardPaymentDetailDto cardDetail;
}
