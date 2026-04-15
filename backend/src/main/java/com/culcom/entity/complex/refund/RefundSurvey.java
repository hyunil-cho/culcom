package com.culcom.entity.complex.refund;

import com.culcom.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "refund_surveys")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RefundSurvey extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_request_seq", unique = true)
    private ComplexRefundRequest refundRequest;

    @Column(name = "branch_seq", nullable = false)
    private Long branchSeq;

    @Column(name = "member_name", nullable = false, length = 100)
    private String memberName;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "participation_period", nullable = false, length = 50)
    private String participationPeriod;

    @Column(name = "belonging_score", nullable = false)
    private Integer belongingScore;

    @Column(name = "team_impact", nullable = false, length = 100)
    private String teamImpact;

    @Column(name = "difference_comment", length = 1000)
    private String differenceComment;

    @Column(name = "improvement_comment", length = 1000)
    private String improvementComment;

    @Column(name = "re_enroll_score", nullable = false)
    private Integer reEnrollScore;
}
