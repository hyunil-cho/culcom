package com.culcom.repository;

import com.culcom.entity.consent.ConsentItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsentItemRepository extends JpaRepository<ConsentItem, Long> {
    List<ConsentItem> findByCategory(String category);
}
