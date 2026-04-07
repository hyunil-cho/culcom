package com.culcom.service;

import com.culcom.dto.complex.settings.PaymentMethodConfigDto;
import com.culcom.entity.complex.settings.PaymentMethodConfig;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.PaymentMethodConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentMethodConfigService {

    private final PaymentMethodConfigRepository repository;

    @Transactional(readOnly = true)
    public List<PaymentMethodConfigDto.Response> listAll() {
        return repository.findAllByOrderBySortOrderAscSeqAsc()
                .stream().map(PaymentMethodConfigDto.Response::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentMethodConfigDto.Response> listActive() {
        return repository.findAllByIsActiveTrueOrderBySortOrderAscSeqAsc()
                .stream().map(PaymentMethodConfigDto.Response::from).toList();
    }

    @Transactional
    public PaymentMethodConfigDto.Response create(PaymentMethodConfigDto.CreateRequest req) {
        if (req.code() == null || req.code().isBlank()) {
            throw new IllegalArgumentException("code는 필수입니다");
        }
        if (req.label() == null || req.label().isBlank()) {
            throw new IllegalArgumentException("label은 필수입니다");
        }
        if (repository.existsByCode(req.code())) {
            throw new IllegalStateException("이미 존재하는 코드입니다: " + req.code());
        }
        PaymentMethodConfig entity = PaymentMethodConfig.builder()
                .code(req.code().trim())
                .label(req.label().trim())
                .sortOrder(req.sortOrder() != null ? req.sortOrder() : 0)
                .isActive(req.isActive() != null ? req.isActive() : true)
                .build();
        return PaymentMethodConfigDto.Response.from(repository.save(entity));
    }

    @Transactional
    public PaymentMethodConfigDto.Response update(Long seq, PaymentMethodConfigDto.UpdateRequest req) {
        PaymentMethodConfig entity = repository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("결제 수단"));
        if (req.label() != null && !req.label().isBlank()) entity.setLabel(req.label().trim());
        if (req.sortOrder() != null) entity.setSortOrder(req.sortOrder());
        if (req.isActive() != null) entity.setIsActive(req.isActive());
        return PaymentMethodConfigDto.Response.from(repository.save(entity));
    }

    @Transactional
    public void delete(Long seq) {
        if (!repository.existsById(seq)) {
            throw new EntityNotFoundException("결제 수단");
        }
        repository.deleteById(seq);
    }
}
