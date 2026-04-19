package com.culcom.dto.complex.survey;

import com.culcom.entity.survey.SurveyTemplate;
import com.culcom.entity.enums.SurveyStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Builder
public class SurveyTemplateResponse {
    private Long seq;
    private String name;
    private String description;
    private SurveyStatus status;
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdateDate;
    private int optionCount;
    private Map<String, List<String>> customerFieldOptions;
    private List<String> customerFieldOrder;

    public static SurveyTemplateResponse from(SurveyTemplate entity) {
        return from(entity, 0);
    }

    public static SurveyTemplateResponse from(SurveyTemplate entity, int optionCount) {
        return SurveyTemplateResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .createdDate(entity.getCreatedDate())
                .lastUpdateDate(entity.getLastUpdateDate())
                .optionCount(optionCount)
                .customerFieldOptions(entity.getCustomerFieldOptions())
                .customerFieldOrder(entity.getCustomerFieldOrder())
                .build();
    }
}
