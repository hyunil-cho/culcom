package com.culcom.entity.complex.staff;

import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.enums.StaffAttendanceStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "complex_staff_attendance",
       uniqueConstraints = @UniqueConstraint(columnNames = {"staff_seq", "class_seq", "attendance_date"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexStaffAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_seq", nullable = false)
    private ComplexStaff staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_seq", nullable = false)
    private ComplexClass complexClass;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StaffAttendanceStatus status = StaffAttendanceStatus.출석;

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }
}
