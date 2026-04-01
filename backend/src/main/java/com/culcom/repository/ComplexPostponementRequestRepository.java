package com.culcom.repository;

import com.culcom.entity.ComplexPostponementRequest;
import com.culcom.entity.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplexPostponementRequestRepository extends JpaRepository<ComplexPostponementRequest, Long> {
    Page<ComplexPostponementRequest> findByBranchSeqOrderByCreatedDateDesc(Long branchSeq, Pageable pageable);
    Page<ComplexPostponementRequest> findByBranchSeqAndStatusOrderByCreatedDateDesc(Long branchSeq, RequestStatus status, Pageable pageable);
}
