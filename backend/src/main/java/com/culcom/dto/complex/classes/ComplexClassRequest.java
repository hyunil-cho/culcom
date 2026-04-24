package com.culcom.dto.complex.classes;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ComplexClassRequest {
    @NotBlank(message = "수업의 이름은 필수값입니다.")
    private String name;
    private String description;
    @NotNull(message = "정원은 필수값입니다.")
    @Min(value = 1, message = "정원은 1명 이상이어야 합니다.")
    private Integer capacity;
    @NotNull(message = "시간대를 설정해주세요")
    private Long timeSlotSeq;
}
