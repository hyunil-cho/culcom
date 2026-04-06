package com.culcom.entity.complex.member;

import com.culcom.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complex_member_metadata")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexMemberMetaData extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_seq", nullable = false, unique = true)
    private ComplexMember member;

    @Column(length = 20)
    private String level;

    @Column(length = 50)
    private String language;

    @Column(name = "signup_channel", length = 100)
    private String signupChannel;
}
