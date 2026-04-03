package com.culcom.dto.complex;

import com.culcom.entity.SurveyTemplateQuestion;
import com.culcom.entity.enums.InputType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SurveyQuestionResponse {
    private Long seq;
    private Long templateSeq;
    private String questionKey;
    private String title;
    private String description;
    private Integer section;
    private String sectionTitle;
    private Boolean showDivider;
    private InputType inputType;
    private Boolean isGrouped;
    private String groups;
    private Integer sortOrder;

    public static SurveyQuestionResponse from(SurveyTemplateQuestion entity) {
        return SurveyQuestionResponse.builder()
                .seq(entity.getSeq())
                .templateSeq(entity.getTemplate().getSeq())
                .questionKey(entity.getQuestionKey())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .section(entity.getSection())
                .sectionTitle(entity.getSectionTitle())
                .showDivider(entity.getShowDivider())
                .inputType(entity.getInputType())
                .isGrouped(entity.getIsGrouped())
                .groups(entity.getGroups())
                .sortOrder(entity.getSortOrder())
                .build();
    }
}
