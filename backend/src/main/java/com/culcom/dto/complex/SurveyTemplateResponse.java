package com.culcom.dto.complex;

import com.culcom.entity.SurveyTemplate;
import com.culcom.entity.enums.SurveyStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SurveyTemplateResponse {
    private Long seq;
    private String name;
    private String description;
    private SurveyStatus status;
    private LocalDateTime createdDate;

    public static SurveyTemplateResponse from(SurveyTemplate entity) {
        return SurveyTemplateResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
