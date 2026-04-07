package com.culcom.entity.complex.settings;

import com.culcom.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

/** 운영자가 관리하는 환급 은행 카탈로그. */
@Entity
@Table(name = "bank_config",
       uniqueConstraints = @UniqueConstraint(columnNames = "code"))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BankConfig extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(nullable = false, length = 50, updatable = false)
    private String code;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
