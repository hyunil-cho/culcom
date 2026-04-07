package com.culcom.dto.complex.classes;

import com.culcom.entity.complex.clazz.ComplexClass;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplexClassResponse {
    private Long seq;
    private String name;
    private String description;
    private Integer capacity;
    private Integer sortOrder;
    private Long timeSlotSeq;
    private String timeSlotName;
    private Long staffSeq;
    private String staffName;
    private Integer memberCount;
    private LocalDateTime createdDate;

    public static ComplexClassResponse from(ComplexClass entity) {
        return ComplexClassResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .description(entity.getDescription())
                .capacity(entity.getCapacity())
                .sortOrder(entity.getSortOrder())
                .timeSlotSeq(entity.getTimeSlot().getSeq())
                .timeSlotName(entity.getTimeSlot().getName())
                .staffSeq(entity.getStaff() != null ? entity.getStaff().getSeq() : null)
                .staffName(entity.getStaff() != null ? entity.getStaff().getName() : null)
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
