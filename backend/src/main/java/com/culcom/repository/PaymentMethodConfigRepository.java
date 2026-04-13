package com.culcom.repository;

import com.culcom.entity.complex.settings.PaymentMethodConfig;

import java.util.Optional;

public interface PaymentMethodConfigRepository extends ConfigurableRepository<PaymentMethodConfig> {
    Optional<PaymentMethodConfig> findByCode(String code);
}
