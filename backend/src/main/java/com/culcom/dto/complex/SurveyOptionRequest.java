package com.culcom.dto.complex;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SurveyOptionRequest {
    private String questionKey;
    private String groupName;
    private String label;
    private Integer sortOrder;
}
