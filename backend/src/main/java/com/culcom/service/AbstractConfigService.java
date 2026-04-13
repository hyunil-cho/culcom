package com.culcom.service;

import com.culcom.dto.complex.settings.ConfigDto;
import com.culcom.entity.complex.settings.Configurable;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.ConfigurableRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public abstract class AbstractConfigService<T extends Configurable> {

    protected abstract ConfigurableRepository<T> getRepository();
    protected abstract String getEntityName();
    protected abstract T buildEntity(ConfigDto.CreateRequest req);

    @Transactional(readOnly = true)
    public List<ConfigDto.Response> listAll() {
        return getRepository().findAllByOrderBySeqAsc()
                .stream().map(ConfigDto.Response::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ConfigDto.Response> listActive() {
        return getRepository().findAllByIsActiveTrueOrderBySeqAsc()
                .stream().map(ConfigDto.Response::from).toList();
    }

    @Transactional
    public ConfigDto.Response create(ConfigDto.CreateRequest req) {
        if (req.code() == null || req.code().isBlank()) {
            throw new IllegalArgumentException("code는 필수입니다");
        }
        if (getRepository().existsByCode(req.code())) {
            throw new IllegalStateException("이미 존재하는 코드입니다: " + req.code());
        }
        T entity = buildEntity(req);
        return ConfigDto.Response.from(getRepository().save(entity));
    }

    @Transactional
    public ConfigDto.Response update(Long seq, ConfigDto.UpdateRequest req) {
        T entity = getRepository().findById(seq)
                .orElseThrow(() -> new EntityNotFoundException(getEntityName()));
        if (req.isActive() != null) entity.setIsActive(req.isActive());
        return ConfigDto.Response.from(getRepository().save(entity));
    }

    @Transactional
    public void delete(Long seq) {
        if (!getRepository().existsById(seq)) {
            throw new EntityNotFoundException(getEntityName());
        }
        getRepository().deleteById(seq);
    }
}
