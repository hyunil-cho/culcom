package com.culcom.repository;

import com.culcom.entity.ComplexClass;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComplexClassRepository extends JpaRepository<ComplexClass, Long> {
    List<ComplexClass> findByBranchSeqOrderBySortOrder(Long branchSeq);
}
