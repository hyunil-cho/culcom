package com.culcom.repository;

import com.culcom.entity.ComplexStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComplexStaffRepository extends JpaRepository<ComplexStaff, Long> {
    List<ComplexStaff> findByBranchSeq(Long branchSeq);
}
