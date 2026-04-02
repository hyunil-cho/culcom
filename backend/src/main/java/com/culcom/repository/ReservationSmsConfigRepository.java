package com.culcom.repository;

import com.culcom.entity.ReservationSmsConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReservationSmsConfigRepository extends JpaRepository<ReservationSmsConfig, Long> {
    Optional<ReservationSmsConfig> findByBranchSeq(Long branchSeq);
}