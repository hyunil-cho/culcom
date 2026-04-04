package com.culcom.entity.integration;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "external_service_type")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ExternalServiceType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(name = "code_name", nullable = false, unique = true, length = 50)
    private String codeName;
}
