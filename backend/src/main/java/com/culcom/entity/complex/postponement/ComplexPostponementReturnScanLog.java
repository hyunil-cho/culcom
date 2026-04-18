package com.culcom.entity.complex.postponement;

import com.culcom.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(
        name = "complex_postponement_return_scan_logs",
        uniqueConstraints = @UniqueConstraint(name = "uk_pprs_branch_scandate", columnNames = {"branch_seq", "scan_date"})
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexPostponementReturnScanLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(name = "branch_seq", nullable = false)
    private Long branchSeq;

    @Column(name = "scan_date", nullable = false)
    private LocalDate scanDate;

    @Column(name = "return_date", nullable = false)
    private LocalDate returnDate;

    @Column(name = "member_count", nullable = false)
    private int memberCount;

    /** 복귀 안내 SMS 발송에 성공한 회원 수 */
    @Column(name = "sms_success_count", nullable = false)
    @Builder.Default
    private int smsSuccessCount = 0;

    /** 복귀 안내 SMS 발송에 실패한 회원 수 (템플릿 미설정·네트워크 오류 포함) */
    @Column(name = "sms_fail_count", nullable = false)
    @Builder.Default
    private int smsFailCount = 0;
}
