package com.culcom.entity.complex.settings;

import com.culcom.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

/** 운영자가 관리하는 가입경로 카탈로그. */
@Entity
@Table(name = "signup_channel_config",
       uniqueConstraints = @UniqueConstraint(columnNames = "code"))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SignupChannelConfig extends BaseTimeEntity implements Configurable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(nullable = false, length = 50, updatable = false)
    private String code;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}