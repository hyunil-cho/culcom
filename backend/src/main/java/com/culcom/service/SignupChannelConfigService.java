package com.culcom.service;

import com.culcom.dto.complex.settings.ConfigDto;
import com.culcom.entity.complex.settings.SignupChannelConfig;
import com.culcom.repository.ConfigurableRepository;
import com.culcom.repository.SignupChannelConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SignupChannelConfigService extends AbstractConfigService<SignupChannelConfig> {

    private final SignupChannelConfigRepository repository;

    @Override protected ConfigurableRepository<SignupChannelConfig> getRepository() { return repository; }
    @Override protected String getEntityName() { return "가입경로"; }

    @Override
    protected SignupChannelConfig buildEntity(ConfigDto.CreateRequest req) {
        return SignupChannelConfig.builder()
                .code(req.code().trim())
                .isActive(req.isActive() != null ? req.isActive() : true)
                .build();
    }
}
