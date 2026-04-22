package com.culcom.dto.complex.member;

import com.culcom.entity.enums.PaymentKind;
import jakarta.validation.constraints.NotBlank;
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

    @NotBlank(message = "결제 수단은 필수입니다")
    private String method;
    @NotNull(message = "납부일은 필수입니다.")
    private LocalDateTime paidDate;

    private String note;

    private CardPaymentDetailDto cardDetail;
}
