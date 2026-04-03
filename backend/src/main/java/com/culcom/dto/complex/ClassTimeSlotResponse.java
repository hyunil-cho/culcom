package com.culcom.dto.complex;

import com.culcom.entity.ClassTimeSlot;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalTime;

@Getter
@Builder
public class ClassTimeSlotResponse {
    private Long seq;
    private String name;
    private String daysOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;

    public static ClassTimeSlotResponse from(ClassTimeSlot entity) {
        return ClassTimeSlotResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .daysOfWeek(entity.getDaysOfWeek())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .build();
    }
}
