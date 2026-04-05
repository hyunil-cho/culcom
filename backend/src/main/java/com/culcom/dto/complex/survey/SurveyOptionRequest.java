package com.culcom.dto.complex.survey;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SurveyOptionRequest {
    @NotNull
    private Long questionSeq;
    private String groupName;
    @NotBlank
    private String label;
}
