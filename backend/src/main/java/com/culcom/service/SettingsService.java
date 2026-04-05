package com.culcom.service;

import com.culcom.dto.settings.MessageTemplateSimpleResponse;
import com.culcom.dto.settings.ReservationSmsConfigRequest;
import com.culcom.dto.settings.ReservationSmsConfigResponse;
import com.culcom.entity.reservation.ReservationSmsConfig;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.MessageTemplateRepository;
import com.culcom.repository.MymunjaConfigInfoRepository;
import com.culcom.repository.ReservationSmsConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final ReservationSmsConfigRepository reservationSmsConfigRepository;
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

    public ReservationSmsConfigResponse getReservationSmsConfig(Long branchSeq) {
        return reservationSmsConfigRepository.findByBranchSeq(branchSeq)
                .map(ReservationSmsConfigResponse::from)
                .orElse(null);
    }

    public ReservationSmsConfigResponse saveReservationSmsConfig(ReservationSmsConfigRequest request, Long branchSeq) {
        ReservationSmsConfig config = reservationSmsConfigRepository.findByBranchSeq(branchSeq)
                .orElseGet(() -> {
                    ReservationSmsConfig newConfig = new ReservationSmsConfig();
                    branchRepository.findById(branchSeq).ifPresent(newConfig::setBranch);
                    return newConfig;
                });

        messageTemplateRepository.findById(request.getTemplateSeq()).ifPresent(config::setTemplate);
        config.setSenderNumber(request.getSenderNumber());
        config.setAutoSend(request.getAutoSend());

        ReservationSmsConfig saved = reservationSmsConfigRepository.save(config);
        return ReservationSmsConfigResponse.from(saved);
    }
}
