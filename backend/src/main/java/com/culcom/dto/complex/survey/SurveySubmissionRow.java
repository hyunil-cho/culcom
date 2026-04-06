package com.culcom.dto.complex.survey;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class SurveySubmissionRow {
    private Long seq;
    private String name;
    private String phoneNumber;
    private String templateName;
    private String createdDate;
}
