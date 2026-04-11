package com.culcom.service;

import com.culcom.dto.complex.settings.SignupChannelConfigDto;
import com.culcom.entity.complex.settings.SignupChannelConfig;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.SignupChannelConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SignupChannelConfigService {

    private final SignupChannelConfigRepository repository;

    @Transactional(readOnly = true)
    public List<SignupChannelConfigDto.Response> listAll() {
        return repository.findAllByOrderBySortOrderAscSeqAsc()
                .stream().map(SignupChannelConfigDto.Response::from).toList();
    }

    @Transactional(readOnly = true)
    public List<SignupChannelConfigDto.Response> listActive() {
        return repository.findAllByIsActiveTrueOrderBySortOrderAscSeqAsc()
                .stream().map(SignupChannelConfigDto.Response::from).toList();
    }

    @Transactional
    public SignupChannelConfigDto.Response create(SignupChannelConfigDto.CreateRequest req) {
        if (req.code() == null || req.code().isBlank()) {
            throw new IllegalArgumentException("code는 필수입니다");
        }
        if (req.label() == null || req.label().isBlank()) {
            throw new IllegalArgumentException("label은 필수입니다");
        }
        if (repository.existsByCode(req.code())) {
            throw new IllegalStateException("이미 존재하는 코드입니다: " + req.code());
        }
        SignupChannelConfig entity = SignupChannelConfig.builder()
                .code(req.code().trim())
                .label(req.label().trim())
                .sortOrder(req.sortOrder() != null ? req.sortOrder() : 0)
                .isActive(req.isActive() != null ? req.isActive() : true)
                .build();
        return SignupChannelConfigDto.Response.from(repository.save(entity));
    }

    @Transactional
    public SignupChannelConfigDto.Response update(Long seq, SignupChannelConfigDto.UpdateRequest req) {
        SignupChannelConfig entity = repository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("가입경로"));
        if (req.label() != null && !req.label().isBlank()) entity.setLabel(req.label().trim());
        if (req.sortOrder() != null) entity.setSortOrder(req.sortOrder());
        if (req.isActive() != null) entity.setIsActive(req.isActive());
        return SignupChannelConfigDto.Response.from(repository.save(entity));
    }

    @Transactional
    public void delete(Long seq) {
        if (!repository.existsById(seq)) {
            throw new EntityNotFoundException("가입경로");
        }
        repository.deleteById(seq);
    }
}