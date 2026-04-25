package com.culcom.repository;

import com.culcom.entity.PublicLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PublicLinkRepository extends JpaRepository<PublicLink, Long> {

    Optional<PublicLink> findByCode(String code);

    boolean existsByCode(String code);
}
