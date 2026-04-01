package com.culcom.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "caller_selection_history")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CallerSelectionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(nullable = false, length = 2)
    private String caller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @Column(name = "selected_date", nullable = false, updatable = false)
    private LocalDateTime selectedDate;

    @PrePersist
    protected void onCreate() {
        selectedDate = LocalDateTime.now();
    }
}
