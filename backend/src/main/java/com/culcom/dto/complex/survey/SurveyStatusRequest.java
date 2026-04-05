package com.culcom.dto.complex.survey;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SurveyStatusRequest {
    @NotBlank(message = "상태 값이 필요합니다.")
    private String status;
}
