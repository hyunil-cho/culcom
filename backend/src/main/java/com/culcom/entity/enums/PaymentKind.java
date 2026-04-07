package com.culcom.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
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

    @JsonCreator
    public static PaymentKind fromValue(String s) {
        if (s == null || s.isBlank()) return null;
        for (PaymentKind k : values()) {
            if (k.name().equalsIgnoreCase(s) || k.label.equals(s)) return k;
        }
        return null;
    }
}
