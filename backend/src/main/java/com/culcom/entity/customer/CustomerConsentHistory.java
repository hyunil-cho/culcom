package com.culcom.entity.customer;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.consent.ConsentItem;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "customer_consent_histories")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CustomerConsentHistory extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_seq", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consent_item_seq", nullable = false)
    private ConsentItem consentItem;

    /** 동의 시점의 약관 본문 스냅샷 */
    @Column(name = "content_snapshot", nullable = false, columnDefinition = "TEXT")
    private String contentSnapshot;

    /** 동의 여부 */
    @Column(nullable = false)
    private Boolean agreed;

    /** 동의 시점의 약관 버전 */
    @Column(nullable = false)
    private Integer version;
}
