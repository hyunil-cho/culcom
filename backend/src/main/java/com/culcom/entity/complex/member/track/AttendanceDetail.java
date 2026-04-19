package com.culcom.entity.complex.member.track;

import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;

@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AttendanceDetail {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_seq")
    private ComplexClass complexClass;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membership_seq")
    private ComplexMemberMembership membership;

    @Enumerated(EnumType.STRING)
    private AttendanceStatus status;

    @Column(name = "used_count_delta")
    @Builder.Default
    private Integer usedCountDelta = 0;

    @Column(name = "used_count_after")
    private Integer usedCountAfter;
}
