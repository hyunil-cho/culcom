package com.culcom.dto.complex.survey;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
public class SurveyTemplateRequest {
    @NotBlank
    private String name;
    private String description;
    private Map<String, List<String>> customerFieldOptions;
    private List<String> customerFieldOrder;
}
