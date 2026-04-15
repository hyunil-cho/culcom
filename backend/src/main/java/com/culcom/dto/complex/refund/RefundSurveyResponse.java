package com.culcom.dto.complex.refund;

import com.culcom.entity.complex.refund.RefundSurvey;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundSurveyResponse {
    private Long seq;
    private Long refundRequestSeq;
    private String memberName;
    private String phoneNumber;
    private String participationPeriod;
    private Integer belongingScore;
    private String teamImpact;
    private String differenceComment;
    private String improvementComment;
    private Integer reEnrollScore;
    private LocalDateTime createdDate;

    public static RefundSurveyResponse from(RefundSurvey entity) {
        return RefundSurveyResponse.builder()
                .seq(entity.getSeq())
                .refundRequestSeq(entity.getRefundRequest() != null ? entity.getRefundRequest().getSeq() : null)
                .memberName(entity.getMemberName())
                .phoneNumber(entity.getPhoneNumber())
                .participationPeriod(entity.getParticipationPeriod())
                .belongingScore(entity.getBelongingScore())
                .teamImpact(entity.getTeamImpact())
                .differenceComment(entity.getDifferenceComment())
                .improvementComment(entity.getImprovementComment())
                .reEnrollScore(entity.getReEnrollScore())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
