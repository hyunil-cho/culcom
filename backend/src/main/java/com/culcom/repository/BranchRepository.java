package com.culcom.repository;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.auth.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BranchRepository extends JpaRepository<Branch, Long> {
    Optional<Branch> findByAlias(String alias);

    List<Branch> findAllByCreatedBy(UserInfo createdBy);
}
