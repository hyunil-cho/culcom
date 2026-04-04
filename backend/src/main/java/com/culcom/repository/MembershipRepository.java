package com.culcom.repository;

import com.culcom.entity.complex.member.Membership;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipRepository extends JpaRepository<Membership, Long> {
}
