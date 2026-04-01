package com.culcom.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "user_info")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq")
    private Branch branch;

    @Column(name = "user_id", nullable = false, unique = true, length = 100)
    private String userId;

    @Column(name = "user_password", nullable = false, length = 200)
    private String userPassword;

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDate createdDate;

    @Column(name = "lastUpdateDate", nullable = false)
    private LocalDate lastUpdateDate;

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
