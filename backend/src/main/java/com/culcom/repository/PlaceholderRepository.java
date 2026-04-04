package com.culcom.repository;

import com.culcom.entity.message.Placeholder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceholderRepository extends JpaRepository<Placeholder, Long> {
}
