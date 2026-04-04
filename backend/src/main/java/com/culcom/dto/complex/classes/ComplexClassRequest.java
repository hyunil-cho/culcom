package com.culcom.dto.complex.classes;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ComplexClassRequest {
    private String name;
    private String description;
    private Integer capacity;
    private Integer sortOrder;
    private Long timeSlotSeq;
    private Long staffSeq;
}
