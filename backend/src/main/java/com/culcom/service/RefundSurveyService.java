package com.culcom.service;

import com.culcom.dto.complex.refund.RefundSurveyResponse;
import com.culcom.repository.RefundSurveyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RefundSurveyService {

    private final RefundSurveyRepository refundSurveyRepository;

    public Optional<RefundSurveyResponse> getByRefundRequest(Long refundRequestSeq) {
        return refundSurveyRepository.findByRefundRequestSeq(refundRequestSeq)
                .map(RefundSurveyResponse::from);
    }

    public RefundSurveyResponse getDetail(Long seq) {
        return refundSurveyRepository.findById(seq)
                .map(RefundSurveyResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("설문 응답을 찾을 수 없습니다."));
    }
}
