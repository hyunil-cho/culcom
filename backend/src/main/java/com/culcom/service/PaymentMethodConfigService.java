package com.culcom.service;

import com.culcom.dto.complex.settings.ConfigDto;
import com.culcom.entity.complex.settings.PaymentMethodConfig;
import com.culcom.repository.ConfigurableRepository;
import com.culcom.repository.PaymentMethodConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PaymentMethodConfigService extends AbstractConfigService<PaymentMethodConfig> {

    private final PaymentMethodConfigRepository repository;

    @Override protected ConfigurableRepository<PaymentMethodConfig> getRepository() { return repository; }
    @Override protected String getEntityName() { return "결제 수단"; }

    @Override
    protected PaymentMethodConfig buildEntity(ConfigDto.CreateRequest req) {
        return PaymentMethodConfig.builder()
                .code(req.code().trim())
                .isActive(req.isActive() != null ? req.isActive() : true)
                .build();
    }
}
