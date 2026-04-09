package com.culcom.repository;

import com.culcom.entity.customer.CustomerConsentHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerConsentHistoryRepository extends JpaRepository<CustomerConsentHistory, Long> {
    List<CustomerConsentHistory> findByCustomerSeq(Long customerSeq);
}
