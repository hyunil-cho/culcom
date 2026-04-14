package com.culcom.repository;

import com.culcom.entity.calendar.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {

    List<CalendarEvent> findByBranchSeqAndEventDateBetweenOrderByStartTimeAsc(
            Long branchSeq, LocalDate startDate, LocalDate endDate);
}
