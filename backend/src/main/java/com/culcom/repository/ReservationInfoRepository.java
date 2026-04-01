package com.culcom.repository;

import com.culcom.entity.ReservationInfo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationInfoRepository extends JpaRepository<ReservationInfo, Long> {
}
