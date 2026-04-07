package com.culcom.repository;

import com.culcom.entity.complex.settings.PaymentMethodConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentMethodConfigRepository extends JpaRepository<PaymentMethodConfig, Long> {
    List<PaymentMethodConfig> findAllByOrderBySortOrderAscSeqAsc();
    List<PaymentMethodConfig> findAllByIsActiveTrueOrderBySortOrderAscSeqAsc();
    Optional<PaymentMethodConfig> findByCode(String code);
    boolean existsByCode(String code);
}
