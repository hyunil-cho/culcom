package com.culcom.repository;

import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ComplexPostponementRequestRepository extends JpaRepository<ComplexPostponementRequest, Long> {

    /**
     * 같은 멤버십에 대해 승인된 연기 기간과 겹치는 레코드가 있는지 확인.
     * 기간 겹침 조건: existing.start <= newEnd AND existing.end >= newStart
     */
    @Query("SELECT COUNT(p) > 0 FROM ComplexPostponementRequest p " +
           "WHERE p.memberMembership.seq = :mmSeq " +
           "  AND p.status = com.culcom.entity.enums.RequestStatus.승인 " +
           "  AND p.startDate <= :newEnd " +
           "  AND p.endDate >= :newStart")
    boolean existsApprovedOverlap(@Param("mmSeq") Long mmSeq,
                                  @Param("newStart") java.time.LocalDate newStart,
                                  @Param("newEnd") java.time.LocalDate newEnd);

    /**
     * 같은 멤버십에 대해 대기 상태의 연기 요청이 있는지 확인.
     * 공개 링크에서 중복 제출을 막기 위함.
     */
    @Query("SELECT COUNT(p) > 0 FROM ComplexPostponementRequest p " +
           "WHERE p.memberMembership.seq = :mmSeq " +
           "  AND p.status = com.culcom.entity.enums.RequestStatus.대기")
    boolean existsPendingByMemberMembershipSeq(@Param("mmSeq") Long mmSeq);

    /**
     * 같은 멤버십에 대해 대기 상태의 연기 기간과 겹치는 레코드가 있는지 확인.
     */
    @Query("SELECT COUNT(p) > 0 FROM ComplexPostponementRequest p " +
           "WHERE p.memberMembership.seq = :mmSeq " +
           "  AND p.status = com.culcom.entity.enums.RequestStatus.대기 " +
           "  AND p.startDate <= :newEnd " +
           "  AND p.endDate >= :newStart")
    boolean existsPendingOverlap(@Param("mmSeq") Long mmSeq,
                                 @Param("newStart") java.time.LocalDate newStart,
                                 @Param("newEnd") java.time.LocalDate newEnd);

    /**
     * 지정한 복귀일(endDate)을 가진 승인된 연기 요청을 지점별로 카운트.
     * 스케줄러가 "다음날 복귀 예정 회원" 집계에 사용.
     */
    @Query("SELECT p.branch.seq AS branchSeq, COUNT(p) AS cnt " +
           "FROM ComplexPostponementRequest p " +
           "WHERE p.status = com.culcom.entity.enums.RequestStatus.승인 " +
           "  AND p.endDate = :returnDate " +
           "GROUP BY p.branch.seq")
    java.util.List<BranchReturnCount> countApprovedByReturnDateGroupByBranch(@Param("returnDate") java.time.LocalDate returnDate);

    /** 지정한 복귀일(endDate)을 가진 승인된 연기 요청 목록 조회. SMS 발송용. */
    @Query("SELECT p FROM ComplexPostponementRequest p " +
           "WHERE p.status = com.culcom.entity.enums.RequestStatus.승인 " +
           "  AND p.endDate = :returnDate")
    java.util.List<ComplexPostponementRequest> findApprovedByReturnDate(@Param("returnDate") java.time.LocalDate returnDate);

    interface BranchReturnCount {
        Long getBranchSeq();
        Long getCnt();
    }
}
