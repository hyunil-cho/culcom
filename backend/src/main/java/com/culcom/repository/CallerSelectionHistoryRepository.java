package com.culcom.repository;

import com.culcom.entity.reservation.CallerSelectionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CallerSelectionHistoryRepository extends JpaRepository<CallerSelectionHistory, Long> {
}
