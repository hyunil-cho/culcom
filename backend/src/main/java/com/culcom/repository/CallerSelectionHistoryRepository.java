package com.culcom.repository;

import com.culcom.entity.reservation.CallerSelectionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CallerSelectionHistoryRepository extends JpaRepository<CallerSelectionHistory, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from CallerSelectionHistory c where c.customer.seq = :customerSeq")
    void deleteByCustomerSeq(@Param("customerSeq") Long customerSeq);
}
