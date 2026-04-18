package com.culcom.service;

import com.culcom.dto.auth.PasswordChangeRequest;
import com.culcom.dto.auth.UserCreateRequest;
import com.culcom.dto.auth.UserResponse;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserBranchRepository;
import com.culcom.repository.UserInfoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * UserService 검증:
 * 1) 지점장이 직원 생성/수정 시 지정한 지점만 매핑된다.
 * 2) 직원 계정은 최초 생성 시 requirePasswordChange=true 이다.
 * 3) 본인 비밀번호 변경 후에는 requirePasswordChange=false 로 해제된다.
 * 4) 관리자가 타인의 비밀번호를 재설정하면 대상은 다시 requirePasswordChange=true 가 된다.
 * 5) 지점장이 자신 관할이 아닌 지점을 직원에게 지정하려 하면 SecurityException.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserServiceTest {

    @Autowired UserService userService;
    @Autowired UserInfoRepository userInfoRepository;
    @Autowired BranchRepository branchRepository;
    @Autowired UserBranchRepository userBranchRepository;
    @Autowired PasswordEncoder passwordEncoder;

    UserInfo root;
    UserInfo manager;
    UserInfo otherManager;
    Branch branchA;
    Branch branchB;
    Branch branchOfOther;

    @BeforeEach
    void setUp() {
        root = userInfoRepository.findByUserId("root").orElseGet(() ->
                userInfoRepository.save(UserInfo.builder()
                        .userId("root").userPassword(passwordEncoder.encode("root"))
                        .role(UserRole.ROOT).requirePasswordChange(false).build()));

        manager = userInfoRepository.save(UserInfo.builder()
                .userId("manager_" + System.nanoTime())
                .userPassword(passwordEncoder.encode("pw"))
                .name("매니저")
                .phone("01011112222")
                .role(UserRole.BRANCH_MANAGER)
                .createdBy(root)
                .requirePasswordChange(false)
                .build());

        otherManager = userInfoRepository.save(UserInfo.builder()
                .userId("other_" + System.nanoTime())
                .userPassword(passwordEncoder.encode("pw"))
                .name("타매니저")
                .phone("01099998888")
                .role(UserRole.BRANCH_MANAGER)
                .createdBy(root)
                .requirePasswordChange(false)
                .build());

        branchA = branchRepository.save(Branch.builder()
                .branchName("A지점").alias("a_" + System.nanoTime()).createdBy(manager).build());
        branchB = branchRepository.save(Branch.builder()
                .branchName("B지점").alias("b_" + System.nanoTime()).createdBy(manager).build());
        branchOfOther = branchRepository.save(Branch.builder()
                .branchName("외부").alias("o_" + System.nanoTime()).createdBy(otherManager).build());
    }

    @Test
    @DisplayName("지점장이 직원을 생성하면 지정한 지점만 UserBranch 에 매핑된다")
    void 직원_생성_시_지정_지점만_매핑() {
        UserCreateRequest req = new UserCreateRequest();
        req.setUserId("staff1");
        req.setPassword("staff-pw");
        req.setName("직원1");
        req.setPhone("01012345678");
        req.setBranchSeqs(List.of(branchA.getSeq()));

        UserResponse created = userService.create(req, manager.getSeq(), UserRole.BRANCH_MANAGER);

        assertThat(created.getRole()).isEqualTo("STAFF");
        assertThat(created.getBranchSeqs()).containsExactly(branchA.getSeq());
        assertThat(created.getRequirePasswordChange()).isTrue();

        UserInfo saved = userInfoRepository.findById(created.getSeq()).orElseThrow();
        assertThat(userBranchRepository.findAllByUser(saved)).hasSize(1);
    }

    @Test
    @DisplayName("직원 수정 시 branchSeqs 를 다시 전달하면 매핑이 교체된다")
    void 직원_수정_시_지점_교체() {
        UserCreateRequest create = new UserCreateRequest();
        create.setUserId("staff_swap");
        create.setPassword("pw");
        create.setName("직원");
        create.setPhone("01000000000");
        create.setBranchSeqs(List.of(branchA.getSeq()));
        UserResponse created = userService.create(create, manager.getSeq(), UserRole.BRANCH_MANAGER);

        UserCreateRequest update = new UserCreateRequest();
        update.setUserId(create.getUserId());
        update.setPassword("");
        update.setName("직원-수정");
        update.setPhone("01000000000");
        update.setBranchSeqs(List.of(branchB.getSeq()));

        UserResponse updated = userService.update(created.getSeq(), update, manager.getSeq());

        assertThat(updated.getBranchSeqs()).containsExactly(branchB.getSeq());
        UserInfo saved = userInfoRepository.findById(created.getSeq()).orElseThrow();
        List<Long> seqs = userBranchRepository.findAllByUser(saved).stream()
                .map(ub -> ub.getBranch().getSeq()).toList();
        assertThat(seqs).containsExactly(branchB.getSeq());
    }

    @Test
    @DisplayName("자기 관할이 아닌 지점을 직원에게 지정하면 SecurityException")
    void 관할_아닌_지점_지정_거절() {
        UserCreateRequest req = new UserCreateRequest();
        req.setUserId("staff_bad");
        req.setPassword("pw");
        req.setName("직원");
        req.setPhone("01000000000");
        req.setBranchSeqs(List.of(branchA.getSeq(), branchOfOther.getSeq()));

        assertThatThrownBy(() ->
                userService.create(req, manager.getSeq(), UserRole.BRANCH_MANAGER))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("본인 비밀번호 변경 시 requirePasswordChange 가 false 로 풀린다")
    void 본인_비밀번호_변경_해제() {
        UserCreateRequest req = new UserCreateRequest();
        req.setUserId("staff_pwd");
        req.setPassword("initial");
        req.setName("직원");
        req.setPhone("01000000000");
        req.setBranchSeqs(List.of(branchA.getSeq()));
        UserResponse created = userService.create(req, manager.getSeq(), UserRole.BRANCH_MANAGER);

        PasswordChangeRequest change = new PasswordChangeRequest();
        change.setCurrentPassword("initial");
        change.setNewPassword("new-password");
        userService.changeOwnPassword(created.getSeq(), change);

        UserInfo reloaded = userInfoRepository.findById(created.getSeq()).orElseThrow();
        assertThat(reloaded.getRequirePasswordChange()).isFalse();
        assertThat(passwordEncoder.matches("new-password", reloaded.getUserPassword())).isTrue();
    }

    @Test
    @DisplayName("현재 비밀번호가 틀리면 본인 비밀번호 변경은 IllegalArgumentException")
    void 현재_비밀번호_불일치_실패() {
        UserCreateRequest req = new UserCreateRequest();
        req.setUserId("staff_pwd2");
        req.setPassword("initial");
        req.setName("직원");
        req.setPhone("01000000000");
        req.setBranchSeqs(List.of(branchA.getSeq()));
        UserResponse created = userService.create(req, manager.getSeq(), UserRole.BRANCH_MANAGER);

        PasswordChangeRequest change = new PasswordChangeRequest();
        change.setCurrentPassword("WRONG");
        change.setNewPassword("new-password");
        assertThatThrownBy(() -> userService.changeOwnPassword(created.getSeq(), change))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("관리자가 타인의 비밀번호를 재설정하면 대상은 다음 로그인 시 변경이 강제된다")
    void 타인_비밀번호_재설정_플래그_복구() {
        UserCreateRequest req = new UserCreateRequest();
        req.setUserId("staff_reset");
        req.setPassword("initial");
        req.setName("직원");
        req.setPhone("01000000000");
        req.setBranchSeqs(List.of(branchA.getSeq()));
        UserResponse created = userService.create(req, manager.getSeq(), UserRole.BRANCH_MANAGER);

        // 먼저 본인이 한 번 변경하여 플래그를 false 로 만든 상태에서 시작
        PasswordChangeRequest self = new PasswordChangeRequest();
        self.setCurrentPassword("initial");
        self.setNewPassword("after-self");
        userService.changeOwnPassword(created.getSeq(), self);
        assertThat(userInfoRepository.findById(created.getSeq()).orElseThrow()
                .getRequirePasswordChange()).isFalse();

        // 매니저가 다시 비밀번호 재설정
        UserCreateRequest admin = new UserCreateRequest();
        admin.setUserId(req.getUserId());
        admin.setPassword("reset-by-admin");
        admin.setName("직원");
        admin.setPhone("01000000000");
        userService.update(created.getSeq(), admin, manager.getSeq());

        UserInfo reloaded = userInfoRepository.findById(created.getSeq()).orElseThrow();
        assertThat(reloaded.getRequirePasswordChange()).isTrue();
        assertThat(passwordEncoder.matches("reset-by-admin", reloaded.getUserPassword())).isTrue();
    }
}
