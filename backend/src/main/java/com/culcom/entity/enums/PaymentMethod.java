package com.culcom.entity.enums;

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
}
