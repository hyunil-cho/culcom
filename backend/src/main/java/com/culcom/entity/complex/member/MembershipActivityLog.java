package com.culcom.entity.complex.member;

import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.staff.ComplexStaff;
import com.culcom.entity.enums.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 출석 활동 히스토리.
 * 회원과 스태프의 출석/결석/연기 등 모든 활동을 통합 기록한다.
 * member 또는 staff 중 하나만 채워진다.
 */
@Entity
@Table(name = "membership_activity_log")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MembershipActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_seq")
    private ComplexMember member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_seq")
    private ComplexStaff staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membership_seq")
    private ComplexMemberMembership membership;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_seq")
    private ComplexClass complexClass;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus status;

    /** usedCount 변동량 (출석: +1, 출석 취소: -1, 결석/연기: 0) */
    @Column(name = "used_count_delta", nullable = false)
    @Builder.Default
    private Integer usedCountDelta = 0;

    /** 변동 후 usedCount 스냅샷 (스태프는 null) */
    @Column(name = "used_count_after")
    private Integer usedCountAfter;

    @Column(length = 300)
    private String note;

    @Column(name = "created_date", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }
}
