package com.culcom.repository;

import com.culcom.entity.integration.ThirdPartyService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ThirdPartyServiceRepository extends JpaRepository<ThirdPartyService, Long> {
    Optional<ThirdPartyService> findByName(String name);
}
