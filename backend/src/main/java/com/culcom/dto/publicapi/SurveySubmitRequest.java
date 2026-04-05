package com.culcom.dto.publicapi;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class SurveySubmitRequest {
    private Long templateSeq;
    private Long reservationSeq;

    // 고객 기본 정보
    private String name;
    private String phoneNumber;
    private String gender;
    private String location;
    private String ageGroup;
    private String occupation;
    private String adSource;

    // 설문 응답 (questionKey → 답변)
    private Map<String, Object> answers;
}
