package com.culcom.dto.publicapi;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data @AllArgsConstructor
public class ClassInfo {
    private String name;
    private String timeSlotName;
    private String startTime;
    private String endTime;
}
