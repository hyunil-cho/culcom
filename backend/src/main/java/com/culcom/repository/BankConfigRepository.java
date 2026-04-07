package com.culcom.repository;

import com.culcom.entity.complex.settings.BankConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BankConfigRepository extends JpaRepository<BankConfig, Long> {
    List<BankConfig> findAllByOrderBySortOrderAscSeqAsc();
    List<BankConfig> findAllByIsActiveTrueOrderBySortOrderAscSeqAsc();
    boolean existsByCode(String code);
}
