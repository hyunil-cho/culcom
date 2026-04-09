package com.culcom.entity.consent;

import com.culcom.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "consent_items")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ConsentItem extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    @Builder.Default
    private Boolean required = true;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false)
    @Builder.Default
    private Integer version = 1;
}
