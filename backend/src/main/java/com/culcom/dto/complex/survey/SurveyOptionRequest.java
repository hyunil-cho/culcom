package com.culcom.dto.complex.survey;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SurveyOptionRequest {
    private Long questionSeq;
    private String groupName;
    private String label;
}
