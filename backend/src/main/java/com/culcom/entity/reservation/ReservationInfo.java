package com.culcom.entity.reservation;

import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservation_info")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ReservationInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDate createdDate;

    @Column(name = "lastUpdateDate", nullable = false)
    private LocalDate lastUpdateDate;

    @Column(nullable = false, length = 2)
    private String caller;

    @Column(name = "interview_date", nullable = false)
    private LocalDateTime interviewDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_seq", nullable = false)
    private UserInfo user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDate.now();
        lastUpdateDate = LocalDate.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastUpdateDate = LocalDate.now();
    }
}
