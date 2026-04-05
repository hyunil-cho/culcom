package com.culcom.dto.complex.classes;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ComplexClassRequest {
    @NotBlank
    private String name;
    private String description;
    private Integer capacity;
    private Integer sortOrder;
    @NotNull
    private Long timeSlotSeq;
    private Long staffSeq;
}
