package com.culcom.repository;

import com.culcom.entity.ComplexPostponementRequest;
import com.culcom.entity.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ComplexPostponementRequestRepository extends JpaRepository<ComplexPostponementRequest, Long> {
    Page<ComplexPostponementRequest> findByBranchSeqOrderByCreatedDateDesc(Long branchSeq, Pageable pageable);
    Page<ComplexPostponementRequest> findByBranchSeqAndStatusOrderByCreatedDateDesc(Long branchSeq, RequestStatus status, Pageable pageable);

    @Query("SELECT r FROM ComplexPostponementRequest r WHERE r.branch.seq = :branchSeq AND (r.memberName LIKE %:keyword% OR r.phoneNumber LIKE %:keyword%) ORDER BY r.createdDate DESC")
    Page<ComplexPostponementRequest> searchByBranchSeq(@Param("branchSeq") Long branchSeq, @Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT r FROM ComplexPostponementRequest r WHERE r.branch.seq = :branchSeq AND r.status = :status AND (r.memberName LIKE %:keyword% OR r.phoneNumber LIKE %:keyword%) ORDER BY r.createdDate DESC")
    Page<ComplexPostponementRequest> searchByBranchSeqAndStatus(@Param("branchSeq") Long branchSeq, @Param("status") RequestStatus status, @Param("keyword") String keyword, Pageable pageable);
}
