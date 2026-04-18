package com.culcom.repository;

import com.culcom.entity.enums.PlaceholderCategory;
import com.culcom.entity.message.Placeholder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PlaceholderRepository extends JpaRepository<Placeholder, Long> {
    List<Placeholder> findByCategoryIn(Collection<PlaceholderCategory> categories);
}
