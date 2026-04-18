package com.culcom.entity.enums;

public enum SmsEventType {
    예약확정,
    고객등록,
    회원등록,
    연기승인,
    연기반려,
    환불승인,
    환불반려,
    양도완료,
    양도거절,
    /** 연기 기간 종료 하루 전, 복귀 예정 회원에게 발송 (스케줄러) */
    복귀안내
}
