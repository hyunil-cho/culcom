package com.culcom.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "entity_labels",
       indexes = @Index(columnList = "entity_type, entity_seq"))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class EntityLabel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_seq", nullable = false)
    private Long entitySeq;

    @Column(name = "label_key", nullable = false, length = 100)
    private String labelKey;

    @Column(name = "label_val", nullable = false, length = 200)
    private String labelVal;
}
