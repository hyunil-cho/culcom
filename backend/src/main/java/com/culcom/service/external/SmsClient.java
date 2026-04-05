package com.culcom.service.external;

import com.culcom.dto.integration.SmsSendResponse;

/**
 * SMS/LMS 외부 발송 인터페이스.
 * 실제 구현체(마이문자 API)와 테스트 Mock을 프로필로 전환.
 */
public interface SmsClient {

    /** SMS/LMS 발송 */
    SmsSendResponse send(String accountId, String password,
                         String senderPhone, String receiverPhone,
                         String message, String subject);

    /** SMS/LMS 잔여건수 조회. 반환: [smsCount, lmsCount] */
    int[] checkRemainingCount(String accountId, String password);
}
