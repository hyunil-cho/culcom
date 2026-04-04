package com.culcom.dto.complex.classes;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

@Getter
@Setter
public class ClassTimeSlotRequest {
    private String name;
    private String daysOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
}
