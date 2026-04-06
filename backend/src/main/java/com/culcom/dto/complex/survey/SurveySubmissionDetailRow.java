package com.culcom.dto.complex.survey;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class SurveySubmissionDetailRow {
    private Long seq;
    private Long templateSeq;
    private String templateName;
    private String name;
    private String phoneNumber;
    private String gender;
    private String location;
    private String ageGroup;
    private String occupation;
    private String adSource;
    private String answers;
    private String createdDate;
}