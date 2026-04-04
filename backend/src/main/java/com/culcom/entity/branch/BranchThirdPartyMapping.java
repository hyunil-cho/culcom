package com.culcom.entity.branch;

import com.culcom.entity.integration.ThirdPartyService;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "branch-third-party-mapping")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BranchThirdPartyMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "mapping_seq")
    private Long mappingSeq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "third_party_id", nullable = false)
    private ThirdPartyService thirdPartyService;

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDate createdDate;

    @Column(name = "lastUpdateDate", nullable = false)
    private LocalDate lastUpdateDate;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

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
