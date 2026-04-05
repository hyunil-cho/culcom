package com.culcom.dto.complex.survey;

import com.culcom.entity.enums.InputType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SurveyQuestionRequest {
    @NotNull
    private Long sectionSeq;
    @NotBlank
    private String questionKey;
    @NotBlank
    private String title;
    private String description;
    private InputType inputType;
    private Boolean isGrouped;
    private String groups;
    private Integer sortOrder;
    private Boolean required;
}
