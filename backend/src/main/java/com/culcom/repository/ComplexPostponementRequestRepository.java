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
}
