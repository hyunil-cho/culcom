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

import java.util.HashMap;
import java.util.Map;


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
        return sendEventSmsIfConfigured(branchSeq, eventType, name, phoneNumber, Map.of());
    }

    /**
     * 추가 컨텍스트(예: 반려 사유 / 승인 코멘트)를 포함하여 발송한다.
     * {@code {action.event_type}} 은 {@code eventType} 에서 자동 도출되므로 호출부가 넣지 않아도 된다.
     */
    public String sendEventSmsIfConfigured(Long branchSeq, SmsEventType eventType,
                                            String name, String phoneNumber,
                                            Map<String, String> extraContext) {
        var optConfig = smsEventConfigRepository.findByBranchSeqAndEventType(branchSeq, eventType);
        if (optConfig.isEmpty()) {
            // 자동발송 설정 자체가 등록되지 않은 경우 — 처리는 완료됐지만 SMS는 못 나갔음을
            // 관리자에게 명시적으로 노출하기 위해 경고를 반환한다.
            return "문자 자동발송 설정이 등록되지 않아 발송하지 못했습니다.";
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

        Map<String, String> fullContext = new HashMap<>();
        if (extraContext != null) fullContext.putAll(extraContext);
        // eventType 기반 자동 주입 (호출부가 명시적으로 덮어쓰면 그 값이 우선)
        fullContext.putIfAbsent("{action.event_type}", eventCategoryLabel(eventType));

        message = messageResolver.resolveWithContext(
                message, config.getBranch(), name, phoneNumber, null, fullContext);

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

    /** SmsEventType 을 사용자 표시용 카테고리 레이블로 변환 (예: 연기승인 → "연기"). */
    private static String eventCategoryLabel(SmsEventType eventType) {
        return switch (eventType) {
            case 연기승인, 연기반려, 복귀안내 -> "연기";
            case 환불승인, 환불반려 -> "환불";
            case 양도완료, 양도거절 -> "양도";
            case 예약확정 -> "예약 확정";
            case 고객등록 -> "고객 등록";
            case 회원등록 -> "회원 등록";
        };
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
