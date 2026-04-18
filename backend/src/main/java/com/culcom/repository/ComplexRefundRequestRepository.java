package com.culcom.repository;

import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ComplexRefundRequestRepository extends JpaRepository<ComplexRefundRequest, Long> {
    Page<ComplexRefundRequest> findByBranchSeqOrderByCreatedDateDesc(Long branchSeq, Pageable pageable);
    Page<ComplexRefundRequest> findByBranchSeqAndStatusOrderByCreatedDateDesc(Long branchSeq, RequestStatus status, Pageable pageable);

    @Query("SELECT r FROM ComplexRefundRequest r WHERE r.branch.seq = :branchSeq AND (r.memberName LIKE %:keyword% OR r.phoneNumber LIKE %:keyword%) ORDER BY r.createdDate DESC")
    Page<ComplexRefundRequest> searchByBranchSeq(@Param("branchSeq") Long branchSeq, @Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT r FROM ComplexRefundRequest r WHERE r.branch.seq = :branchSeq AND r.status = :status AND (r.memberName LIKE %:keyword% OR r.phoneNumber LIKE %:keyword%) ORDER BY r.createdDate DESC")
    Page<ComplexRefundRequest> searchByBranchSeqAndStatus(@Param("branchSeq") Long branchSeq, @Param("status") RequestStatus status, @Param("keyword") String keyword, Pageable pageable);

    /**
     * 동일 멤버십에 대해 대기/반려 상태의 환불 요청이 존재하는지 확인.
     * 대기: 아직 처리되지 않은 요청이 있어 중복 제출 차단
     * 반려: 관리자가 반려한 건에 대해 재제출 차단 (관리자 문의 유도)
     */
    @Query("SELECT COUNT(r) > 0 FROM ComplexRefundRequest r " +
           "WHERE r.memberMembership.seq = :mmSeq " +
           "  AND r.status IN (com.culcom.entity.enums.RequestStatus.대기, " +
           "                   com.culcom.entity.enums.RequestStatus.반려)")
    boolean existsBlockingByMemberMembershipSeq(@Param("mmSeq") Long mmSeq);

    /**
     * 여러 멤버십에 대해 환불 요청이 있는 멤버십 seq 목록 조회.
     * 공개 검색 시 환불 진행 중/반려된 멤버십을 선택 목록에서 제외하기 위함.
     */
    @Query("SELECT DISTINCT r.memberMembership.seq FROM ComplexRefundRequest r " +
           "WHERE r.memberMembership.seq IN :mmSeqs " +
           "  AND r.status IN (com.culcom.entity.enums.RequestStatus.대기, " +
           "                   com.culcom.entity.enums.RequestStatus.반려)")
    java.util.List<Long> findBlockedMemberMembershipSeqs(@Param("mmSeqs") java.util.List<Long> mmSeqs);
}
