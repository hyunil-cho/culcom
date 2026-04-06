package com.culcom.entity.complex.staff;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.complex.member.ComplexMember;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complex_staff_change_logs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexStaffChangeLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_seq", nullable = false)
    private ComplexMember member;

    /** 변경 유형: INFO_CHANGE, REFUND_CHANGE */
    @Column(name = "change_type", nullable = false, length = 30)
    private String changeType;

    @Column(name = "field_name", nullable = false, length = 50)
    private String fieldName;

    @Column(name = "old_value", length = 500)
    private String oldValue;

    @Column(name = "new_value", length = 500)
    private String newValue;
}
