package com.culcom.repository;

import com.culcom.entity.reservation.ReservationInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ReservationInfoRepository extends JpaRepository<ReservationInfo, Long> {
    List<ReservationInfo> findByBranchSeqAndInterviewDateBetweenOrderByInterviewDateAsc(
            Long branchSeq, LocalDateTime start, LocalDateTime end);
}
