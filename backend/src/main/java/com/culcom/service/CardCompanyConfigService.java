package com.culcom.service;

import com.culcom.dto.complex.settings.ConfigDto;
import com.culcom.entity.complex.settings.CardCompanyConfig;
import com.culcom.repository.CardCompanyConfigRepository;
import com.culcom.repository.ConfigurableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CardCompanyConfigService extends AbstractConfigService<CardCompanyConfig> {

    private final CardCompanyConfigRepository repository;

    @Override protected ConfigurableRepository<CardCompanyConfig> getRepository() { return repository; }
    @Override protected String getEntityName() { return "카드사"; }

    @Override
    protected CardCompanyConfig buildEntity(ConfigDto.CreateRequest req) {
        return CardCompanyConfig.builder()
                .code(req.code().trim())
                .isActive(req.isActive() != null ? req.isActive() : true)
                .build();
    }
}
