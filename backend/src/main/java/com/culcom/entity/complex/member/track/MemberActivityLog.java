package com.culcom.entity.complex.member.track;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.enums.ActivityEventType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 회원/스태프 통합 활동 로그.
 * 출석, 상태변경, 수업배정, 정보변경, 환불변경 등 모든 이벤트를 하나로 기록한다.
 */
@Entity
@Table(name = "member_activity_log", indexes = {
        @Index(name = "idx_mal_member_event", columnList = "member_seq, event_type"),
        @Index(name = "idx_mal_member_date", columnList = "member_seq, event_date")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MemberActivityLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_seq", nullable = false)
    private ComplexMember member;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private ActivityEventType eventType;

    @Column(name = "event_date", nullable = false)
    private LocalDateTime eventDate;

    /** 멤버십 관련 이벤트일 때 어떤 사용권(ComplexMemberMembership)에 대한 변화인지 식별. */
    @Column(name = "member_membership_seq")
    private Long memberMembershipSeq;

    @Embedded
    private AttendanceDetail attendanceDetail;

    @Embedded
    private ChangeDetail changeDetail;

    @Column(length = 300)
    private String note;
}
