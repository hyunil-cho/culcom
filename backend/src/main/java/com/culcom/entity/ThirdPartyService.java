package com.culcom.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "third_party_services")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ThirdPartyService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(name = "created_date", nullable = false, updatable = false)
    private LocalDate createdDate;

    @Column(name = "update_date", nullable = false)
    private LocalDate updateDate;

    @Column(nullable = false, length = 50, unique = true)
    private String name;

    @Column(length = 100)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "code_seq")
    private ExternalServiceType externalServiceType;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDate.now();
        updateDate = LocalDate.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updateDate = LocalDate.now();
    }
}
