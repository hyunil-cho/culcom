package com.culcom.service;

import com.culcom.dto.integration.SmsSendResponse;
import com.culcom.entity.branch.BranchThirdPartyMapping;
import com.culcom.entity.integration.MymunjaConfigInfo;
import com.culcom.repository.BranchThirdPartyMappingRepository;
import com.culcom.repository.MymunjaConfigInfoRepository;
import com.culcom.service.external.SmsClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmsService {

    private final BranchThirdPartyMappingRepository mappingRepository;
    private final MymunjaConfigInfoRepository mymunjaConfigInfoRepository;
    private final SmsClient smsClient;

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
    @Transactional
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
