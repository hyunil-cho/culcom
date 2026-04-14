package com.culcom.service;

import com.culcom.dto.settings.*;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.settings.SmsEventConfig;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final SmsEventConfigRepository smsEventConfigRepository;
    private final MessageTemplateRepository messageTemplateRepository;
    private final MymunjaConfigInfoRepository mymunjaConfigInfoRepository;
    private final BranchRepository branchRepository;

    public List<MessageTemplateSimpleResponse> getTemplates(Long branchSeq) {
        return messageTemplateRepository
                .findByBranchSeqAndIsActiveTrueOrderByIsDefaultDescLastUpdateDateDesc(branchSeq)
                .stream()
                .map(MessageTemplateSimpleResponse::from)
                .toList();
    }

    public List<String> getSenderNumbers(Long branchSeq) {
        return mymunjaConfigInfoRepository.findSenderNumbersByBranchSeq(branchSeq);
    }

    // ── SMS 이벤트 설정 ──

    public List<SmsEventConfigResponse> listSmsEventConfigs(Long branchSeq) {
        return smsEventConfigRepository.findByBranchSeq(branchSeq).stream()
                .map(SmsEventConfigResponse::from).toList();
    }

    public SmsEventConfigResponse getSmsEventConfig(Long branchSeq, SmsEventType eventType) {
        return smsEventConfigRepository.findByBranchSeqAndEventType(branchSeq, eventType)
                .map(SmsEventConfigResponse::from).orElse(null);
    }

    public SmsEventConfigResponse saveSmsEventConfig(SmsEventConfigRequest request, Long branchSeq) {
        SmsEventType eventType = SmsEventType.valueOf(request.getEventType());
        SmsEventConfig config = smsEventConfigRepository.findByBranchSeqAndEventType(branchSeq, eventType)
                .orElseGet(() -> {
                    SmsEventConfig newConfig = new SmsEventConfig();
                    branchRepository.findById(branchSeq).ifPresent(newConfig::setBranch);
                    newConfig.setEventType(eventType);
                    return newConfig;
                });

        messageTemplateRepository.findById(request.getTemplateSeq()).ifPresent(config::setTemplate);
        config.setSenderNumber(request.getSenderNumber());
        config.setAutoSend(request.getAutoSend());

        return SmsEventConfigResponse.from(smsEventConfigRepository.save(config));
    }

    public void deleteSmsEventConfig(Long branchSeq, SmsEventType eventType) {
        smsEventConfigRepository.findByBranchSeqAndEventType(branchSeq, eventType)
                .ifPresent(smsEventConfigRepository::delete);
    }

    /** 이벤트 타입에 해당하는 자동발송 설정을 조회한다 (서비스 레이어에서 사용) */
    public Optional<SmsEventConfig> findAutoSendConfig(Long branchSeq, SmsEventType eventType) {
        return smsEventConfigRepository.findByBranchSeqAndEventType(branchSeq, eventType)
                .filter(SmsEventConfig::getAutoSend);
    }
}
