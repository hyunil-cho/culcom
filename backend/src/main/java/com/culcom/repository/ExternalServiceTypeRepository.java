package com.culcom.repository;

import com.culcom.entity.ExternalServiceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExternalServiceTypeRepository extends JpaRepository<ExternalServiceType, Long> {
    Optional<ExternalServiceType> findByCodeName(String codeName);
}
