package com.culcom.service;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.auth.LoginRequest;
import com.culcom.dto.auth.SessionInfo;
import com.culcom.entity.auth.UserBranch;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.UserRole;
import com.culcom.exception.ForbiddenException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserBranchRepository;
import com.culcom.repository.UserInfoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * AuthService 의 고수준 오케스트레이션 메서드 (login / getCurrentSession / selectBranch) 검증.
 * 컨트롤러에서 떼어낸 로직이 서비스 레이어에서 제대로 동작하는지 확인한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthServiceFlowTest {

    @Autowired AuthService authService;
    @Autowired UserInfoRepository userInfoRepository;
    @Autowired BranchRepository branchRepository;
    @Autowired UserBranchRepository userBranchRepository;
    @Autowired PasswordEncoder passwordEncoder;

    UserInfo manager;
    UserInfo staff;
    Branch managerBranchA;
    Branch managerBranchB;
    Branch otherBranch;

    @BeforeEach
    void setUp() {
        UserInfo root = userInfoRepository.findByUserId("root").orElseGet(() ->
                userInfoRepository.save(UserInfo.builder()
                        .userId("root")
                        .userPassword(passwordEncoder.encode("root"))
                        .role(UserRole.ROOT)
                        .requirePasswordChange(false).build()));

        manager = userInfoRepository.save(UserInfo.builder()
                .userId("mgr_" + System.nanoTime())
                .userPassword(passwordEncoder.encode("pw"))
                .name("매니저")
                .role(UserRole.BRANCH_MANAGER)
                .createdBy(root)
                .requirePasswordChange(false).build());

        managerBranchA = branchRepository.save(Branch.builder()
                .branchName("A").alias("a_" + System.nanoTime()).createdBy(manager).build());
        managerBranchB = branchRepository.save(Branch.builder()
                .branchName("B").alias("b_" + System.nanoTime()).createdBy(manager).build());

        UserInfo otherMgr = userInfoRepository.save(UserInfo.builder()
                .userId("other_" + System.nanoTime())
                .userPassword(passwordEncoder.encode("pw"))
                .role(UserRole.BRANCH_MANAGER)
                .createdBy(root)
                .requirePasswordChange(false).build());
        otherBranch = branchRepository.save(Branch.builder()
                .branchName("O").alias("o_" + System.nanoTime()).createdBy(otherMgr).build());

        staff = userInfoRepository.save(UserInfo.builder()
                .userId("staff_" + System.nanoTime())
                .userPassword(passwordEncoder.encode("pw"))
                .name("스태프")
                .role(UserRole.STAFF)
                .createdBy(manager)
                .requirePasswordChange(true).build());
        userBranchRepository.save(UserBranch.builder().user(staff).branch(managerBranchA).build());
    }

    @Test
    @DisplayName("login 성공 시 첫 관리지점이 선택되고 SessionInfo 반환")
    void login_성공() {
        LoginRequest req = new LoginRequest();
        req.setUserId(manager.getUserId());
        req.setPassword("pw");

        SessionInfo info = authService.login(req, new MockHttpServletRequest(), new MockHttpServletResponse());

        assertThat(info.getUserSeq()).isEqualTo(manager.getSeq());
        assertThat(info.getRole()).isEqualTo("BRANCH_MANAGER");
        assertThat(info.getSelectedBranchSeq()).isNotNull();
        assertThat(info.getSelectedBranchName()).isNotNull();
        assertThat(info.getRequirePasswordChange()).isFalse();
    }

    @Test
    @DisplayName("login 실패 시 AccessDeniedException")
    void login_실패_401() {
        LoginRequest req = new LoginRequest();
        req.setUserId(manager.getUserId());
        req.setPassword("WRONG");

        assertThatThrownBy(() -> authService.login(req,
                new MockHttpServletRequest(), new MockHttpServletResponse()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("login 시 staff 의 requirePasswordChange=true 가 SessionInfo 에 그대로 반영된다")
    void login_강제변경_플래그_전달() {
        LoginRequest req = new LoginRequest();
        req.setUserId(staff.getUserId());
        req.setPassword("pw");

        SessionInfo info = authService.login(req,
                new MockHttpServletRequest(), new MockHttpServletResponse());

        assertThat(info.getRequirePasswordChange()).isTrue();
    }

    @Test
    @DisplayName("getCurrentSession: principal 이 null 이면 AccessDeniedException")
    void me_비인증_401() {
        assertThatThrownBy(() -> authService.getCurrentSession(null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("getCurrentSession: 정상 principal 은 DB 값을 반영한 SessionInfo 반환")
    void me_세션_조회() {
        CustomUserPrincipal principal = new CustomUserPrincipal(
                staff.getSeq(), staff.getUserId(), staff.getName(),
                staff.getRole(), managerBranchA.getSeq());

        SessionInfo info = authService.getCurrentSession(principal);

        assertThat(info.getUserSeq()).isEqualTo(staff.getSeq());
        assertThat(info.getSelectedBranchName()).isEqualTo(managerBranchA.getBranchName());
        assertThat(info.getRequirePasswordChange()).isTrue();
    }

    @Test
    @DisplayName("selectBranch: 관할 지점이면 정상 통과")
    void selectBranch_정상() {
        // 로그인 세션 설정 (SecurityContext 필요)
        authService.loginSession(new MockHttpServletRequest(), new MockHttpServletResponse(),
                manager, managerBranchA.getSeq());
        CustomUserPrincipal principal = new CustomUserPrincipal(
                manager.getSeq(), manager.getUserId(), manager.getName(),
                manager.getRole(), managerBranchA.getSeq());

        authService.selectBranch(managerBranchB.getSeq(), principal,
                new MockHttpServletRequest(), new MockHttpServletResponse());
    }

    @Test
    @DisplayName("selectBranch: 존재하지 않는 지점은 IllegalArgumentException (400)")
    void selectBranch_없는지점_400() {
        CustomUserPrincipal principal = new CustomUserPrincipal(
                manager.getSeq(), manager.getUserId(), manager.getName(),
                manager.getRole(), managerBranchA.getSeq());

        assertThatThrownBy(() -> authService.selectBranch(999_999L, principal,
                new MockHttpServletRequest(), new MockHttpServletResponse()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("존재하지 않는 지점");
    }

    @Test
    @DisplayName("selectBranch: 관할이 아닌 지점은 ForbiddenException (403)")
    void selectBranch_권한없음_403() {
        CustomUserPrincipal principal = new CustomUserPrincipal(
                manager.getSeq(), manager.getUserId(), manager.getName(),
                manager.getRole(), managerBranchA.getSeq());

        assertThatThrownBy(() -> authService.selectBranch(otherBranch.getSeq(), principal,
                new MockHttpServletRequest(), new MockHttpServletResponse()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    @DisplayName("selectBranch: ROOT 는 어떤 지점이든 선택 가능")
    void selectBranch_ROOT() {
        UserInfo root = userInfoRepository.findByUserId("root").orElseThrow();
        authService.loginSession(new MockHttpServletRequest(), new MockHttpServletResponse(),
                root, null);
        CustomUserPrincipal principal = new CustomUserPrincipal(
                root.getSeq(), root.getUserId(), root.getName(), root.getRole(), null);

        authService.selectBranch(otherBranch.getSeq(), principal,
                new MockHttpServletRequest(), new MockHttpServletResponse());
    }
}
