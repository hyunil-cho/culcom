package com.culcom.dto.complex;

import com.culcom.entity.enums.InputType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SurveyQuestionRequest {
    private Long sectionSeq;
    private String questionKey;
    private String title;
    private String description;
    private InputType inputType;
    private Boolean isGrouped;
    private String groups;
    private Integer sortOrder;
    private Boolean required;
}
