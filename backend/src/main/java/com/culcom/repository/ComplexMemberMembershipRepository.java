package com.culcom.repository;

import com.culcom.entity.ComplexMemberMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComplexMemberMembershipRepository extends JpaRepository<ComplexMemberMembership, Long> {
    List<ComplexMemberMembership> findByMemberSeq(Long memberSeq);
}
