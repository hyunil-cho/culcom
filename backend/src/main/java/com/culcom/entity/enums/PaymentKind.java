package com.culcom.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 멤버십 결제 내역 1건의 종류 */
@Getter
@RequiredArgsConstructor
public enum PaymentKind {
    DEPOSIT("디포짓"),
    BALANCE("잔금"),
    ADDITIONAL("추가납부"),
    REFUND("환불정정");

    private final String label;
}
