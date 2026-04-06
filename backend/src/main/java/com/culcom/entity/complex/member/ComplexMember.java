package com.culcom.entity.complex.member;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "complex_members")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexMember extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @OneToOne(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private ComplexMemberMetaData metaData;

    @Column(length = 300)
    private String info;

    @Column(name = "chart_number", length = 50)
    private String chartNumber;

    @Column(columnDefinition = "text")
    private String comment;

    @Column(name = "join_date")
    private LocalDateTime joinDate;

    @Column(length = 100)
    private String interviewer;

}
