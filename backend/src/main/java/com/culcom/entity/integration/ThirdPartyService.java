package com.culcom.entity.integration;

import com.culcom.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "third_party_services")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ThirdPartyService extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(nullable = false, length = 50, unique = true)
    private String name;

    @Column(length = 100)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "code_seq")
    private ExternalServiceType externalServiceType;
}
