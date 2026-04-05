package com.culcom.entity.complex.clazz;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

@Entity
@Table(name = "class_time_slots")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ClassTimeSlot extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "days_of_week", nullable = false, length = 100)
    private String daysOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

}
