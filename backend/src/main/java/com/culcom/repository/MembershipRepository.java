package com.culcom.repository;

import com.culcom.entity.product.Membership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MembershipRepository extends JpaRepository<Membership, Long> {
    Optional<Membership> findByName(String name);
    List<Membership> findByIsInternalFalse();
    Optional<Membership> findFirstByIsInternalTrue();
}
