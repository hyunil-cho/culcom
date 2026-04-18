package com.culcom.entity.enums;

import java.util.EnumSet;
import java.util.Set;

/**
 * 플레이스홀더 카테고리.
 * SmsEventType 별로 허용되는 카테고리가 다르며, 템플릿 편집 시 필터링 기준이 된다.
 */
public enum PlaceholderCategory {
    COMMON,
    RESERVATION,
    POSTPONEMENT,
    REFUND,
    TRANSFER,
    /** 연기/환불/양도 이벤트에서 공통으로 쓸 수 있는 사유 계열 플레이스홀더 */
    ACTION_REASON;

    /**
     * 이벤트 타입에 허용되는 플레이스홀더 카테고리 집합.
     * COMMON 은 모든 이벤트에서 공통으로 허용된다.
     */
    public static Set<PlaceholderCategory> allowedFor(SmsEventType eventType) {
        return switch (eventType) {
            case 예약확정 -> EnumSet.of(COMMON, RESERVATION);
            case 고객등록, 회원등록 -> EnumSet.of(COMMON);
            case 연기승인, 연기반려 -> EnumSet.of(COMMON, POSTPONEMENT, ACTION_REASON);
            case 환불승인, 환불반려 -> EnumSet.of(COMMON, REFUND, ACTION_REASON);
            case 양도완료, 양도거절 -> EnumSet.of(COMMON, TRANSFER, ACTION_REASON);
            case 복귀안내 -> EnumSet.of(COMMON, POSTPONEMENT);
        };
    }
}
