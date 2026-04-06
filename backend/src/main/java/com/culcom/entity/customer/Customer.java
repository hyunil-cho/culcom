package com.culcom.entity.customer;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.CustomerStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "customers")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Customer extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq")
    private Branch branch;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(length = 200)
    private String comment;

    @Column(name = "commercial_name", length = 100)
    private String commercialName;

    @Column(name = "ad_source", length = 100)
    private String adSource;

    @Column(length = 100)
    private String interviewer;

    @Column(name = "kakao_id", unique = true)
    private Long kakaoId;

    @Column(name = "call_count", columnDefinition = "int unsigned default 0")
    @Builder.Default
    private Integer callCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CustomerStatus status = CustomerStatus.신규;
}
