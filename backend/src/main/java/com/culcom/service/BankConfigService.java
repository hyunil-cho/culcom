package com.culcom.service;

import com.culcom.dto.complex.settings.BankConfigDto;
import com.culcom.entity.complex.settings.BankConfig;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BankConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BankConfigService {

    private final BankConfigRepository repository;

    @Transactional(readOnly = true)
    public List<BankConfigDto.Response> listAll() {
        return repository.findAllByOrderBySortOrderAscSeqAsc()
                .stream().map(BankConfigDto.Response::from).toList();
    }

    @Transactional(readOnly = true)
    public List<BankConfigDto.Response> listActive() {
        return repository.findAllByIsActiveTrueOrderBySortOrderAscSeqAsc()
                .stream().map(BankConfigDto.Response::from).toList();
    }

    @Transactional
    public BankConfigDto.Response create(BankConfigDto.CreateRequest req) {
        if (req.code() == null || req.code().isBlank()) {
            throw new IllegalArgumentException("code는 필수입니다");
        }
        if (req.label() == null || req.label().isBlank()) {
            throw new IllegalArgumentException("label은 필수입니다");
        }
        if (repository.existsByCode(req.code())) {
            throw new IllegalStateException("이미 존재하는 코드입니다: " + req.code());
        }
        BankConfig entity = BankConfig.builder()
                .code(req.code().trim())
                .label(req.label().trim())
                .sortOrder(req.sortOrder() != null ? req.sortOrder() : 0)
                .isActive(req.isActive() != null ? req.isActive() : true)
                .build();
        return BankConfigDto.Response.from(repository.save(entity));
    }

    @Transactional
    public BankConfigDto.Response update(Long seq, BankConfigDto.UpdateRequest req) {
        BankConfig entity = repository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("은행"));
        if (req.label() != null && !req.label().isBlank()) entity.setLabel(req.label().trim());
        if (req.sortOrder() != null) entity.setSortOrder(req.sortOrder());
        if (req.isActive() != null) entity.setIsActive(req.isActive());
        return BankConfigDto.Response.from(repository.save(entity));
    }

    @Transactional
    public void delete(Long seq) {
        if (!repository.existsById(seq)) {
            throw new EntityNotFoundException("은행");
        }
        repository.deleteById(seq);
    }
}
