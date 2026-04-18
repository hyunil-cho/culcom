package com.culcom.service;

import com.culcom.entity.auth.UserBranch;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserBranchRepository;
import com.culcom.repository.UserInfoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AuthService.getManagedBranches 가 STAFF 의 경우
 * 생성자(BRANCH_MANAGER)의 모든 지점이 아니라 UserBranch 매핑된 지점만 반환하는지 검증.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthServiceManagedBranchesTest {

    @Autowired AuthService authService;
    @Autowired UserInfoRepository userInfoRepository;
    @Autowired BranchRepository branchRepository;
    @Autowired UserBranchRepository userBranchRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("STAFF 는 UserBranch 로 매핑된 지점만 관리한다 (생성자의 다른 지점은 제외)")
    void staff_는_매핑된_지점만() {
        UserInfo root = userInfoRepository.findByUserId("root").orElseGet(() ->
                userInfoRepository.save(UserInfo.builder()
                        .userId("root").userPassword(passwordEncoder.encode("root"))
                        .role(UserRole.ROOT).requirePasswordChange(false).build()));

        UserInfo manager = userInfoRepository.save(UserInfo.builder()
                .userId("mgr_" + System.nanoTime())
                .userPassword(passwordEncoder.encode("pw"))
                .role(UserRole.BRANCH_MANAGER)
                .createdBy(root)
                .requirePasswordChange(false).build());

        Branch a = branchRepository.save(Branch.builder()
                .branchName("A").alias("a_" + System.nanoTime()).createdBy(manager).build());
        Branch b = branchRepository.save(Branch.builder()
                .branchName("B").alias("b_" + System.nanoTime()).createdBy(manager).build());
        Branch c = branchRepository.save(Branch.builder()
                .branchName("C").alias("c_" + System.nanoTime()).createdBy(manager).build());

        UserInfo staff = userInfoRepository.save(UserInfo.builder()
                .userId("staff_" + System.nanoTime())
                .userPassword(passwordEncoder.encode("pw"))
                .role(UserRole.STAFF)
                .createdBy(manager)
                .requirePasswordChange(true).build());

        userBranchRepository.save(UserBranch.builder().user(staff).branch(a).build());
        userBranchRepository.save(UserBranch.builder().user(staff).branch(c).build());

        List<Branch> managed = authService.getManagedBranches(staff);
        assertThat(managed).extracting(Branch::getSeq)
                .containsExactlyInAnyOrder(a.getSeq(), c.getSeq())
                .doesNotContain(b.getSeq());

        // 매니저는 본인이 생성한 모든 지점
        List<Branch> managerBranches = authService.getManagedBranches(manager);
        assertThat(managerBranches).extracting(Branch::getSeq)
                .containsExactlyInAnyOrder(a.getSeq(), b.getSeq(), c.getSeq());
    }
}
