package com.culcom.dto.complex.survey;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SurveySectionRequest {
    @NotBlank
    private String title;
}
