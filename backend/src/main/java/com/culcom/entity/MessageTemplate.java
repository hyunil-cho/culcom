package com.culcom.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "message_templates")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MessageTemplate {

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

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDate createdDate;

    @Column(name = "lastUpdateDate", nullable = false)
    private LocalDate lastUpdateDate;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "message_context", columnDefinition = "text")
    private String messageContext;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDate.now();
        lastUpdateDate = LocalDate.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastUpdateDate = LocalDate.now();
    }
}
