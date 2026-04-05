package com.culcom.entity.complex.staff;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complex_staff_class_mapping",
       uniqueConstraints = @UniqueConstraint(columnNames = {"staff_seq", "class_time_slot_seq"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexStaffClassMapping extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_seq", nullable = false)
    private ComplexStaff staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_time_slot_seq", nullable = false)
    private ClassTimeSlot classTimeSlot;

}
