package com.culcom.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 결제 수단 */
@Getter
@RequiredArgsConstructor
public enum PaymentMethod {
    CARD("카드"),
    ONLINE_SUBSCRIPTION("온라인구독"),
    ONLINE_CREDIT("온라인신용"),
    TOSS_LINK("토스링크"),
    BANK_TRANSFER_PERSONAL("이체(개인통장)"),
    BANK_TRANSFER_CORPORATE("이체(법인통장)"),
    CASH("현금"),
    OTHER("기타");

    private final String label;

    /** enum NAME(예: "CARD") 또는 한글 label(예: "카드") 양쪽 모두 수용. */
    @JsonCreator
    public static PaymentMethod fromValue(String s) {
        if (s == null || s.isBlank()) return null;
        for (PaymentMethod m : values()) {
            if (m.name().equalsIgnoreCase(s) || m.label.equals(s)) return m;
        }
        return null;
    }
}
