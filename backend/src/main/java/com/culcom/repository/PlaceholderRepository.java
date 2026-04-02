package com.culcom.repository;

import com.culcom.entity.Placeholder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceholderRepository extends JpaRepository<Placeholder, Long> {
}
