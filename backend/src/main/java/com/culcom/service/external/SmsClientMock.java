package com.culcom.service.external;

import com.culcom.dto.integration.SmsSendResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("test")
public class SmsClientMock implements SmsClient {

    @Override
    public SmsSendResponse send(String accountId, String password,
                                String senderPhone, String receiverPhone,
                                String message, String subject) {
        log.info("[Mock] SMS 발송 — 수신: {}, 발신: {}, 메시지: {}자", receiverPhone, senderPhone, message.length());
        return SmsSendResponse.builder()
                .success(true)
                .message("테스트 메시지 발송 완료 (Mock)")
                .code("0000").nums("1").cols("9999").msgType("SMS")
                .build();
    }

    @Override
    public int[] checkRemainingCount(String accountId, String password) {
        log.info("[Mock] 잔여건수 조회 — accountId: {}", accountId);
        return new int[]{999, 999};
    }
}
