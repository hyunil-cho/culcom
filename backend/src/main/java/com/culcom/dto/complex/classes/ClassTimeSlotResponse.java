package com.culcom.dto.complex.classes;

import com.culcom.entity.complex.clazz.ClassTimeSlot;
import lombok.Builder;
import lombok.Getter;

import java.time.format.DateTimeFormatter;

@Getter
@Builder
public class ClassTimeSlotResponse {
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private Long seq;
    private String name;
    private String daysOfWeek;
    private String startTime;
    private String endTime;

    public static ClassTimeSlotResponse from(ClassTimeSlot entity) {
        return ClassTimeSlotResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .daysOfWeek(entity.getDaysOfWeek())
                .startTime(entity.getStartTime().format(HH_MM))
                .endTime(entity.getEndTime().format(HH_MM))
                .build();
    }
}
