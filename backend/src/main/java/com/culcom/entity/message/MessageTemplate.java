package com.culcom.entity.message;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "message_templates")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MessageTemplate extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private Boolean isDefault = false;

    @Column(name = "template_name", nullable = false, length = 300)
    private String templateName;

    @Column(length = 300)
    private String description;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "message_context", columnDefinition = "text")
    private String messageContext;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;
}
