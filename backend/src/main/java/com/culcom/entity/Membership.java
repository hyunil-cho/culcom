package com.culcom.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "memberships")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Membership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private Integer duration;

    @Column(nullable = false)
    private Integer count;

    @Column(nullable = false)
    private Integer price;

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "lastUpdateDate")
    private LocalDateTime lastUpdateDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }
}
