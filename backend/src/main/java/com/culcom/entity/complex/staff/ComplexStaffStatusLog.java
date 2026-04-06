package com.culcom.entity.complex.staff;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.enums.StaffStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complex_staff_status_logs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexStaffStatusLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_seq", nullable = false)
    private ComplexStaff staff;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", nullable = false)
    private StaffStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false)
    private StaffStatus toStatus;
}
