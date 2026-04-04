package com.culcom.dto.complex.survey;

import com.culcom.entity.survey.SurveyTemplateSection;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SurveySectionResponse {
    private Long seq;
    private Long templateSeq;
    private String title;
    private Integer sortOrder;

    public static SurveySectionResponse from(SurveyTemplateSection entity) {
        return SurveySectionResponse.builder()
                .seq(entity.getSeq())
                .templateSeq(entity.getTemplate().getSeq())
                .title(entity.getTitle())
                .sortOrder(entity.getSortOrder())
                .build();
    }
}
