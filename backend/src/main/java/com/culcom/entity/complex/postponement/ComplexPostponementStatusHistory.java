package com.culcom.entity.complex.postponement;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.enums.RequestStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complex_postponement_status_history")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexPostponementStatusHistory extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_seq", nullable = false)
    private ComplexPostponementRequest request;

    @Enumerated(EnumType.STRING)
    @Column(name = "prev_status")
    private RequestStatus prevStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false)
    private RequestStatus newStatus;

    @Column(name = "reject_reason", length = 300)
    private String rejectReason;

    @Column(name = "changed_by", length = 100)
    private String changedBy;

}
