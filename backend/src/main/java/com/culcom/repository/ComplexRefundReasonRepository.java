package com.culcom.repository;

import com.culcom.entity.complex.refund.ComplexRefundReason;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplexRefundReasonRepository extends JpaRepository<ComplexRefundReason, Long> {
    List<ComplexRefundReason> findByBranchSeq(Long branchSeq);
}
