package com.culcom.entity;

import com.culcom.entity.enums.RequestStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "complex_postponement_requests")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexPostponementRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_seq")
    private ComplexMember member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_membership_seq")
    private ComplexMemberMembership memberMembership;

    @Column(name = "member_name", nullable = false, length = 100)
    private String memberName;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "time_slot", nullable = false, length = 200)
    private String timeSlot;

    @Column(name = "current_class", nullable = false, length = 200)
    private String currentClass;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, length = 300)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequestStatus status = RequestStatus.대기;

    @Column(name = "reject_reason", length = 300)
    private String rejectReason;

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "lastUpdateDate")
    private LocalDateTime lastUpdateDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }
}
