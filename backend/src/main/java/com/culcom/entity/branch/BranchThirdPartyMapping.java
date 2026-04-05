package com.culcom.entity.branch;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.integration.ThirdPartyService;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "branch-third-party-mapping")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BranchThirdPartyMapping extends BaseTimeEntity {

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

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
