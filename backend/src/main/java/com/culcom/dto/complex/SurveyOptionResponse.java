package com.culcom.dto.complex;

import com.culcom.entity.SurveyTemplateOption;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SurveyOptionResponse {
    private Long seq;
    private Long templateSeq;
    private String questionKey;
    private String groupName;
    private String label;
    private Integer sortOrder;
    private LocalDateTime createdDate;

    public static SurveyOptionResponse from(SurveyTemplateOption entity) {
        return SurveyOptionResponse.builder()
                .seq(entity.getSeq())
                .templateSeq(entity.getTemplate().getSeq())
                .questionKey(entity.getQuestionKey())
                .groupName(entity.getGroupName())
                .label(entity.getLabel())
                .sortOrder(entity.getSortOrder())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
