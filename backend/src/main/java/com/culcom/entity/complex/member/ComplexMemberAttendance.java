package com.culcom.entity.complex.member;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.enums.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "complex_member_attendance",
       uniqueConstraints = @UniqueConstraint(columnNames = {"member_membership_seq", "class_seq", "attendance_date"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexMemberAttendance extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_membership_seq", nullable = false)
    private ComplexMemberMembership memberMembership;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_seq")
    private ComplexClass complexClass;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AttendanceStatus status = AttendanceStatus.출석;

    @Column(length = 200)
    private String note;

}
