package com.culcom.entity.complex.member;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.complex.clazz.ComplexClass;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complex_member_class_mapping",
       uniqueConstraints = @UniqueConstraint(columnNames = {"member_seq", "class_seq"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexMemberClassMapping extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_seq", nullable = false)
    private ComplexMember member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_seq", nullable = false)
    private ComplexClass complexClass;

}
