package com.culcom.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;

@NoRepositoryBean
public interface ConfigurableRepository<T> extends JpaRepository<T, Long> {
    List<T> findAllByOrderBySeqAsc();
    List<T> findAllByIsActiveTrueOrderBySeqAsc();
    boolean existsByCode(String code);
}
