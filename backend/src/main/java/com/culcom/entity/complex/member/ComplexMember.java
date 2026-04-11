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

    /** 스태프→일반회원 전환 차단: 이미 staffInfo가 있는 회원의 staffInfo를 null로 설정할 수 없음. */
    public void setStaffInfo(ComplexStaffInfo staffInfo) {
        if (this.staffInfo != null && staffInfo == null) {
            throw new IllegalStateException("스태프를 일반 회원으로 전환할 수 없습니다.");
        }
        this.staffInfo = staffInfo;
    }

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

    @OneToOne(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true)
    private ComplexMemberMetaData metaData;

    @OneToOne(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true)
    private ComplexStaffInfo staffInfo;

    @Column(length = 300)
    private String info;

    @Column(columnDefinition = "text")
    private String comment;

    @Column(name = "join_date")
    private LocalDateTime joinDate;

}
