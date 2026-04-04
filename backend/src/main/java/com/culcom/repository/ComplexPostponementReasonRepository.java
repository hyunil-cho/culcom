package com.culcom.repository;

import com.culcom.entity.complex.postponement.ComplexPostponementReason;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComplexPostponementReasonRepository extends JpaRepository<ComplexPostponementReason, Long> {
    List<ComplexPostponementReason> findByBranchSeq(Long branchSeq);
}
