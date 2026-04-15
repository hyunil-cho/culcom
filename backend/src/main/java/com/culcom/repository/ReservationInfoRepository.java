package com.culcom.repository;

import com.culcom.entity.reservation.ReservationInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ReservationInfoRepository extends JpaRepository<ReservationInfo, Long> {
    List<ReservationInfo> findByBranchSeqAndInterviewDateBetweenOrderByInterviewDateAsc(
            Long branchSeq, LocalDateTime start, LocalDateTime end);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from ReservationInfo r where r.customer.seq = :customerSeq")
    void deleteByCustomerSeq(@Param("customerSeq") Long customerSeq);
}
