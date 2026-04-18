package com.culcom.repository;

import com.culcom.entity.auth.UserBranch;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserBranchRepository extends JpaRepository<UserBranch, Long> {
    List<UserBranch> findAllByUser(UserInfo user);
    List<UserBranch> findAllByUserSeq(Long userSeq);
    void deleteAllByUser(UserInfo user);
    boolean existsByUserAndBranch(UserInfo user, Branch branch);
}
