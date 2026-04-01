package com.culcom.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "complex_member_class_mapping",
       uniqueConstraints = @UniqueConstraint(columnNames = {"member_seq", "class_seq"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexMemberClassMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_seq", nullable = false)
    private ComplexMember member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_seq", nullable = false)
    private ComplexClass complexClass;

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }
}
