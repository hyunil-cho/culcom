package com.culcom.service;

import com.culcom.dto.publicapi.SurveySubmitRequest;
import com.culcom.entity.consent.ConsentItem;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.customer.CustomerConsentHistory;
import com.culcom.entity.reservation.ReservationInfo;
import com.culcom.entity.survey.SurveySubmission;
import com.culcom.entity.survey.SurveyTemplate;
import com.culcom.entity.survey.SurveyTemplateQuestion;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PublicSurveyService {

    private final SurveySubmissionRepository submissionRepository;
    private final SurveyTemplateRepository templateRepository;
    private final SurveyTemplateQuestionRepository questionRepository;
    private final ReservationInfoRepository reservationInfoRepository;
    private final ConsentItemRepository consentItemRepository;
    private final CustomerConsentHistoryRepository consentHistoryRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void submit(SurveySubmitRequest req) {
        SurveyTemplate template = templateRepository.findById(req.getTemplateSeq())
                .orElseThrow(() -> new EntityNotFoundException("설문지"));

        String answersJson = serializeAnswers(req);

        SurveySubmission submission = SurveySubmission.builder()
                .branchSeq(template.getBranch().getSeq())
                .templateSeq(template.getSeq())
                .reservationSeq(req.getReservationSeq())
                .name(req.getName().trim())
                .phoneNumber(req.getPhoneNumber().replaceAll("[^0-9]", ""))
                .gender(req.getGender())
                .location(req.getLocation())
                .ageGroup(req.getAgeGroup())
                .occupation(req.getOccupation())
                .adSource(req.getAdSource())
                .answers(answersJson)
                .templateName(template.getName())
                .questionSnapshot(buildQuestionSnapshot(template.getSeq()))
                .build();

        submissionRepository.save(submission);

        saveConsentHistories(req);
    }

    private String buildQuestionSnapshot(Long templateSeq) {
        try {
            List<SurveyTemplateQuestion> questions = questionRepository.findByTemplateSeqOrderBySortOrder(templateSeq);
            Map<String, String> snapshot = new LinkedHashMap<>();
            for (SurveyTemplateQuestion q : questions) {
                Long sectionSeq = q.getSection() != null ? q.getSection().getSeq() : null;
                String compositeKey = (sectionSeq != null ? sectionSeq : "") + ":" + q.getQuestionKey();
                snapshot.put(compositeKey, q.getTitle());
            }
            return objectMapper.writeValueAsString(snapshot);
        } catch (Exception e) {
            log.warn("질문 스냅샷 생성 실패", e);
            return "{}";
        }
    }

    private String serializeAnswers(SurveySubmitRequest req) {
        try {
            return req.getAnswers() != null ? objectMapper.writeValueAsString(req.getAnswers()) : "{}";
        } catch (Exception e) {
            log.warn("설문 응답 직렬화 실패", e);
            return "{}";
        }
    }

    private void saveConsentHistories(SurveySubmitRequest req) {
        if (req.getConsents() == null || req.getConsents().isEmpty() || req.getReservationSeq() == null) {
            return;
        }

        Customer customer = reservationInfoRepository.findById(req.getReservationSeq())
                .map(ReservationInfo::getCustomer)
                .orElse(null);

        if (customer == null) return;

        for (SurveySubmitRequest.ConsentAgreement ca : req.getConsents()) {
            ConsentItem item = consentItemRepository.findById(ca.getConsentItemSeq()).orElse(null);
            if (item == null) continue;

            consentHistoryRepository.save(CustomerConsentHistory.builder()
                    .customer(customer)
                    .consentItem(item)
                    .contentSnapshot(item.getContent())
                    .agreed(ca.getAgreed())
                    .version(item.getVersion())
                    .build());
        }
    }
}
