package com.culcom.repository;

import com.culcom.entity.ComplexRefundRequest;
import com.culcom.entity.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplexRefundRequestRepository extends JpaRepository<ComplexRefundRequest, Long> {
    Page<ComplexRefundRequest> findByBranchSeqOrderByCreatedDateDesc(Long branchSeq, Pageable pageable);
    Page<ComplexRefundRequest> findByBranchSeqAndStatusOrderByCreatedDateDesc(Long branchSeq, RequestStatus status, Pageable pageable);
}
