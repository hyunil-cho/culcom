package com.culcom.entity.complex.staff;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.complex.clazz.ComplexClass;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complex_staff_class_logs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexStaffClassLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_seq", nullable = false)
    private ComplexStaff staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_seq", nullable = false)
    private ComplexClass complexClass;

    /** ASSIGN: 배정, UNASSIGN: 해제 */
    @Column(name = "action", nullable = false, length = 20)
    private String action;
}
