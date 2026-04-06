package com.culcom.repository;

import com.culcom.entity.complex.staff.ComplexStaffChangeLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplexStaffChangeLogRepository extends JpaRepository<ComplexStaffChangeLog, Long> {
}
