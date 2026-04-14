package com.culcom.service;

import com.culcom.dto.integration.SmsSendResponse;
import com.culcom.entity.branch.BranchThirdPartyMapping;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.integration.MymunjaConfigInfo;
import com.culcom.entity.settings.SmsEventConfig;
import com.culcom.repository.BranchThirdPartyMappingRepository;
import com.culcom.repository.MymunjaConfigInfoRepository;
import com.culcom.repository.SmsEventConfigRepository;
import com.culcom.service.external.SmsClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Slf4j
@Service
@RequiredArgsConstructor
public class SmsService {

    private final BranchThirdPartyMappingRepository mappingRepository;
    private final MymunjaConfigInfoRepository mymunjaConfigInfoRepository;
    private final SmsEventConfigRepository smsEventConfigRepository;
    private final SmsClient smsClient;
    private final SmsMessageResolver messageResolver;

    /** SMS/LMS 발송 — SmsClient에 위임 */
    public SmsSendResponse send(String accountId, String password,
                                String senderPhone, String receiverPhone,
                                String message, String subject) {
        return smsClient.send(accountId, password, senderPhone, receiverPhone, message, subject);
    }

    /** 지점 기준 SMS 발송 */
    public SmsSendResponse sendByBranch(Long branchSeq, String senderPhone,
                                         String receiverPhone, String message, String subject) {
        MymunjaConfigInfo config = findSmsConfig(branchSeq);
        if (config == null) {
            return SmsSendResponse.builder().success(false).message("SMS 연동 설정이 없습니다.").build();
        }
        return smsClient.send(config.getMymunjaId(), config.getMymunjaPassword(),
                senderPhone, receiverPhone, message, subject);
    }

    /** 잔여건수 조회 — SmsClient에 위임 */
    public int[] checkRemainingCount(String accountId, String password) {
        return smsClient.checkRemainingCount(accountId, password);
    }

    /** 발송 후 잔여건수 DB 업데이트 */
    @Transactional(propagation = Propagation.NESTED)
    public void updateRemainingCount(Long branchSeq, String cols, String msgType) {
        MymunjaConfigInfo config = findSmsConfig(branchSeq);
        if (config == null) return;

        try {
            int remaining = Integer.parseInt(cols);
            if ("LMS".equalsIgnoreCase(msgType)) {
                config.setRemainingCountLms(remaining);
            } else {
                config.setRemainingCountSms(remaining);
            }
            mymunjaConfigInfoRepository.save(config);
            log.info("잔여건수 업데이트 - Type: {}, Count: {}", msgType, remaining);
        } catch (NumberFormatException e) {
            log.warn("잔여건수 파싱 실패: {}", cols);
        }
    }

    /**
     * 이벤트 타입에 해당하는 자동발송 설정이 있으면 SMS를 발송한다.
     * 템플릿의 플레이스홀더를 치환한다.
     *
     * @return 경고 메시지 (null이면 정상 발송 또는 자동발송 비활성)
     */
    public String sendEventSmsIfConfigured(Long branchSeq, SmsEventType eventType,
                                            String name, String phoneNumber) {
        var optConfig = smsEventConfigRepository.findByBranchSeqAndEventType(branchSeq, eventType);
        if (optConfig.isEmpty()) {
            return null; // 설정 자체가 없음 → 경고 없이 정상 처리
        }
        SmsEventConfig config = optConfig.get();
        if (!config.getAutoSend()) {
            return "문자 자동발송이 비활성화 상태입니다.";
        }

        String message = config.getTemplate().getMessageContext();
        if (message == null || message.isBlank()) {
            log.warn("SMS 이벤트 설정({})의 템플릿 내용이 비어있습니다.", eventType);
            return "문자 발송 실패: 메시지 템플릿 내용이 비어있습니다.";
        }
        message = messageResolver.resolveWithContext(message, config.getBranch(), name, phoneNumber, null);

        SmsSendResponse result = sendByBranch(branchSeq, config.getSenderNumber(), phoneNumber, message, null);
        if (result.isSuccess()) {
            log.info("SMS 자동발송 성공 - 이벤트: {}, 수신자: {}", eventType, phoneNumber);
            updateRemainingCount(branchSeq, result.getCols(), result.getMsgType());
            return null;
        } else {
            log.warn("SMS 자동발송 실패 - 이벤트: {}, 수신자: {}, 사유: {}", eventType, phoneNumber, result.getMessage());
            return "문자 발송 실패: " + result.getMessage();
        }
    }

    private MymunjaConfigInfo findSmsConfig(Long branchSeq) {
        return mappingRepository.findByBranchSeq(branchSeq)
                .stream()
                .filter(m -> m.getThirdPartyService().getExternalServiceType() != null
                        && "SMS".equals(m.getThirdPartyService().getExternalServiceType().getCodeName()))
                .findFirst()
                .map(BranchThirdPartyMapping::getMappingSeq)
                .flatMap(mymunjaConfigInfoRepository::findByMappingMappingSeq)
                .orElse(null);
    }
}
