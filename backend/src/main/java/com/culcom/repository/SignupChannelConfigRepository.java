package com.culcom.repository;

import com.culcom.entity.complex.settings.SignupChannelConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SignupChannelConfigRepository extends JpaRepository<SignupChannelConfig, Long> {
    List<SignupChannelConfig> findAllByOrderBySortOrderAscSeqAsc();
    List<SignupChannelConfig> findAllByIsActiveTrueOrderBySortOrderAscSeqAsc();
    boolean existsByCode(String code);
}