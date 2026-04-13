package com.culcom.service;

import com.culcom.dto.complex.settings.ConfigDto;
import com.culcom.entity.complex.settings.BankConfig;
import com.culcom.repository.BankConfigRepository;
import com.culcom.repository.ConfigurableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BankConfigService extends AbstractConfigService<BankConfig> {

    private final BankConfigRepository repository;

    @Override protected ConfigurableRepository<BankConfig> getRepository() { return repository; }
    @Override protected String getEntityName() { return "은행"; }

    @Override
    protected BankConfig buildEntity(ConfigDto.CreateRequest req) {
        return BankConfig.builder()
                .code(req.code().trim())
                .isActive(req.isActive() != null ? req.isActive() : true)
                .build();
    }
}
