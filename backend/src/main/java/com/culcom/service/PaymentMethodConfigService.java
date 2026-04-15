package com.culcom.service;

import com.culcom.dto.complex.settings.ConfigDto;
import com.culcom.entity.complex.settings.PaymentMethodConfig;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.ConfigurableRepository;
import com.culcom.repository.PaymentMethodConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
                .locked(false)
                .build();
    }

    @Override
    @Transactional
    public ConfigDto.Response update(Long seq, ConfigDto.UpdateRequest req) {
        PaymentMethodConfig entity = repository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException(getEntityName()));
        if (Boolean.TRUE.equals(entity.getLocked())) {
            throw new IllegalStateException("기본 결제 수단은 변경할 수 없습니다: " + entity.getCode());
        }
        return super.update(seq, req);
    }

    @Override
    @Transactional
    public void delete(Long seq) {
        PaymentMethodConfig entity = repository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException(getEntityName()));
        if (Boolean.TRUE.equals(entity.getLocked())) {
            throw new IllegalStateException("기본 결제 수단은 삭제할 수 없습니다: " + entity.getCode());
        }
        super.delete(seq);
    }
}
