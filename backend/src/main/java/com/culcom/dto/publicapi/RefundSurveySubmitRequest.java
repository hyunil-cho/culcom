package com.culcom.dto.publicapi;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefundSurveySubmitRequest {
    private Long branchSeq;
    private Long refundRequestSeq;
    private String memberName;
    private String phoneNumber;
    private String participationPeriod;
    private Integer belongingScore;
    private String teamImpact;
    private String differenceComment;
    private String improvementComment;
    private Integer reEnrollScore;
}
