package com.culcom.dto.calendar;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
public class ReservationDateUpdateRequest {
    @NotNull(message = "예약 일시는 필수입니다.")
    private LocalDateTime interviewDate;
}
