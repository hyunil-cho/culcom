package com.culcom.repository;

import com.culcom.entity.UserInfo;
import com.culcom.entity.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface UserInfoRepository extends JpaRepository<UserInfo, Long> {
    Optional<UserInfo> findByUserId(String userId);

    @Query("SELECT u FROM UserInfo u JOIN u.branches b WHERE b.seq = :branchSeq")
    List<UserInfo> findByBranchSeq(Long branchSeq);

    @Query("SELECT u FROM UserInfo u JOIN u.branches b WHERE b.seq = :branchSeq AND u.role = :role")
    List<UserInfo> findByBranchSeqAndRole(Long branchSeq, UserRole role);
}
