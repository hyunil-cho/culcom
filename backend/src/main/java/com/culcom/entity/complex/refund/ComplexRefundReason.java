package com.culcom.entity.complex.refund;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complex_refund_reasons")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexRefundReason extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @Column(nullable = false, length = 200)
    private String reason;
}
