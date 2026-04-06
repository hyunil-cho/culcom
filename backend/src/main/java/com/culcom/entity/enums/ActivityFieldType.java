package com.culcom.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ActivityFieldType {
    NAME("이름"),
    PHONE_NUMBER("전화번호"),
    INTERVIEWER("면접관"),
    STATUS("상태"),
    CLASS("수업"),
    DEPOSIT_AMOUNT("입금액"),
    REFUNDABLE_DEPOSIT("환불가능금액"),
    NON_REFUNDABLE_DEPOSIT("환불불가금액"),
    REFUND_BANK("환불은행"),
    REFUND_ACCOUNT("환불계좌"),
    REFUND_AMOUNT("환불금액"),
    PAYMENT_METHOD("결제방식"),
    REFUND_INFO("환불정보");

    private final String label;
}
