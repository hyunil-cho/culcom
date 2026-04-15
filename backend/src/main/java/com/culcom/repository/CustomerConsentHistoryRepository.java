package com.culcom.repository;

import com.culcom.entity.customer.CustomerConsentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CustomerConsentHistoryRepository extends JpaRepository<CustomerConsentHistory, Long> {
    List<CustomerConsentHistory> findByCustomerSeq(Long customerSeq);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from CustomerConsentHistory c where c.customer.seq = :customerSeq")
    void deleteByCustomerSeq(@Param("customerSeq") Long customerSeq);
}
