package com.culcom.dto.complex.survey;

import com.culcom.entity.survey.SurveyTemplateQuestion;
import com.culcom.entity.enums.InputType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SurveyQuestionResponse {
    private Long seq;
    private Long templateSeq;
    private Long sectionSeq;
    private String questionKey;
    private String title;
    private String description;
    private InputType inputType;
    private Boolean isGrouped;
    private String groupLabel;
    private Integer sortOrder;
    private Boolean required;

    public static SurveyQuestionResponse from(SurveyTemplateQuestion entity) {
        return SurveyQuestionResponse.builder()
                .seq(entity.getSeq())
                .templateSeq(entity.getTemplate().getSeq())
                .sectionSeq(entity.getSection() != null ? entity.getSection().getSeq() : null)
                .questionKey(entity.getQuestionKey())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .inputType(entity.getInputType())
                .isGrouped(entity.getIsGrouped())
                .groupLabel(entity.getGroupLabel())
                .sortOrder(entity.getSortOrder())
                .required(entity.getRequired())
                .build();
    }
}
