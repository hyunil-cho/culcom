package com.culcom.service;

import com.culcom.dto.publicapi.RefundSurveySubmitRequest;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.complex.refund.RefundSurvey;
import com.culcom.repository.ComplexRefundRequestRepository;
import com.culcom.repository.RefundSurveyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PublicRefundSurveyService {

    private final RefundSurveyRepository refundSurveyRepository;
    private final ComplexRefundRequestRepository refundRequestRepository;

    @Transactional
    public void submit(RefundSurveySubmitRequest req) {
        if (req.getBranchSeq() == null) {
            throw new IllegalArgumentException("지점 정보가 필요합니다.");
        }
        if (req.getMemberName() == null || req.getMemberName().isBlank()) {
            throw new IllegalArgumentException("이름을 입력해주세요.");
        }
        if (req.getPhoneNumber() == null || req.getPhoneNumber().isBlank()) {
            throw new IllegalArgumentException("연락처를 입력해주세요.");
        }

        if (req.getRefundRequestSeq() != null) {
            if (refundSurveyRepository.existsByRefundRequestSeq(req.getRefundRequestSeq())) {
                throw new IllegalArgumentException("이미 설문에 응답하셨습니다.");
            }
        }

        ComplexRefundRequest refundRequest = null;
        if (req.getRefundRequestSeq() != null) {
            refundRequest = refundRequestRepository.findById(req.getRefundRequestSeq()).orElse(null);
        }

        RefundSurvey survey = RefundSurvey.builder()
                .refundRequest(refundRequest)
                .branchSeq(req.getBranchSeq())
                .memberName(req.getMemberName())
                .phoneNumber(req.getPhoneNumber())
                .participationPeriod(req.getParticipationPeriod())
                .belongingScore(req.getBelongingScore())
                .teamImpact(req.getTeamImpact())
                .differenceComment(req.getDifferenceComment())
                .improvementComment(req.getImprovementComment())
                .reEnrollScore(req.getReEnrollScore())
                .build();

        refundSurveyRepository.save(survey);
    }
}
