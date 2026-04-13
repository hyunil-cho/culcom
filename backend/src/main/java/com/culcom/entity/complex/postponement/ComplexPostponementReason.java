package com.culcom.entity.complex.postponement;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.BranchReason;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complex_postponement_reasons")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexPostponementReason extends BaseTimeEntity implements BranchReason {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @Column(nullable = false, length = 200)
    private String reason;

}
