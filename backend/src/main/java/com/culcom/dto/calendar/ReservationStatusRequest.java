package com.culcom.dto.calendar;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReservationStatusRequest {
    @NotBlank(message = "상태 값이 필요합니다.")
    private String status;
}
