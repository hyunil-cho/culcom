package com.culcom.repository;

import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface UserInfoRepository extends JpaRepository<UserInfo, Long> {
    Optional<UserInfo> findByUserId(String userId);
    List<UserInfo> findByCreatedBy(UserInfo createdBy);
}
