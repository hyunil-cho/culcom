package com.culcom.service;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.auth.LoginRequest;
import com.culcom.dto.auth.SessionInfo;
import com.culcom.entity.auth.UserBranch;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.UserRole;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.exception.ForbiddenException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserBranchRepository;
import com.culcom.repository.UserInfoRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserInfoRepository userInfoRepository;
    private final BranchRepository branchRepository;
    private final UserBranchRepository userBranchRepository;
    private final SecurityContextRepository securityContextRepository;
    private final PasswordEncoder passwordEncoder;

    // ─────────────────────────────────────────────────────────────
    // 고수준 오케스트레이션 (컨트롤러에서 직접 호출)
    // ─────────────────────────────────────────────────────────────

    /**
     * 아이디/비밀번호 검증 → 세션 생성 → SessionInfo 반환.
     * 인증 실패 시 AccessDeniedException (HTTP 401).
     */
    public SessionInfo login(LoginRequest request,
                             HttpServletRequest httpRequest,
                             HttpServletResponse httpResponse) {
        UserInfo user = authenticate(request.getUserId(), request.getPassword())
                .orElseThrow(() -> new AccessDeniedException("아이디 또는 비밀번호가 올바르지 않습니다."));

        Branch initialBranch = pickInitialBranch(user);
        Long branchSeq = initialBranch != null ? initialBranch.getSeq() : null;
        String branchName = initialBranch != null ? initialBranch.getBranchName() : null;

        loginSession(httpRequest, httpResponse, user, branchSeq);

        return buildSessionInfo(user.getSeq(), user.getUserId(), user.getName(),
                user.getRole(), branchSeq, branchName,
                Boolean.TRUE.equals(user.getRequirePasswordChange()));
    }

    /**
     * 현재 로그인된 세션의 SessionInfo 반환.
     * 인증되지 않았으면 AccessDeniedException (HTTP 401).
     */
    public SessionInfo getCurrentSession(CustomUserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("인증되지 않았습니다.");
        }

        Long branchSeq = principal.getSelectedBranchSeq();
        String branchName = null;
        if (branchSeq != null) {
            branchName = branchRepository.findById(branchSeq)
                    .map(Branch::getBranchName).orElse(null);
        }

        boolean requirePasswordChange = userInfoRepository.findById(principal.getUserSeq())
                .map(u -> Boolean.TRUE.equals(u.getRequirePasswordChange()))
                .orElse(false);

        return buildSessionInfo(principal.getUserSeq(), principal.getUserId(), principal.getName(),
                principal.getRole(), branchSeq, branchName, requirePasswordChange);
    }

    /**
     * 세션의 선택 지점을 변경한다.
     * 존재하지 않는 지점 → IllegalArgumentException (HTTP 400)
     * ROOT 가 아닌 사용자가 관리하지 않는 지점 → ForbiddenException (HTTP 403)
     */
    public void selectBranch(Long branchSeq,
                             CustomUserPrincipal principal,
                             HttpServletRequest httpRequest,
                             HttpServletResponse httpResponse) {
        if (!branchRepository.existsById(branchSeq)) {
            throw new IllegalArgumentException("존재하지 않는 지점입니다.");
        }
        if (!UserRole.ROOT.equals(principal.getRole())) {
            UserInfo user = userInfoRepository.findById(principal.getUserSeq())
                    .orElseThrow(() -> new EntityNotFoundException("사용자"));
            boolean managed = getManagedBranches(user).stream()
                    .anyMatch(b -> b.getSeq().equals(branchSeq));
            if (!managed) {
                throw new ForbiddenException("접근 권한이 없는 지점입니다.");
            }
        }
        updateSelectedBranch(httpRequest, httpResponse, branchSeq);
    }

    // ─────────────────────────────────────────────────────────────
    // 저수준 빌딩 블록 (다른 서비스/컨트롤러에서도 재사용)
    // ─────────────────────────────────────────────────────────────

    public Optional<UserInfo> authenticate(String userId, String password) {
        return userInfoRepository.findByUserId(userId)
                .filter(user -> passwordEncoder.matches(password, user.getUserPassword()));
    }

    public void loginSession(HttpServletRequest request, HttpServletResponse response,
                             UserInfo user, Long initialBranchSeq) {
        var principal = new CustomUserPrincipal(
                user.getSeq(), user.getUserId(), user.getName(),
                user.getRole(), initialBranchSeq
        );

        var auth = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }

    public void updateSelectedBranch(HttpServletRequest request, HttpServletResponse response,
                                     Long branchSeq) {
        SecurityContext context = SecurityContextHolder.getContext();
        var auth = (UsernamePasswordAuthenticationToken) context.getAuthentication();
        var principal = (CustomUserPrincipal) auth.getPrincipal();
        principal.setSelectedBranchSeq(branchSeq);
        securityContextRepository.saveContext(context, request, response);
    }

    /**
     * 해당 유저가 관리하는 지점 목록 조회.
     * BRANCH_MANAGER: 본인이 생성한 지점
     * STAFF: UserBranch 매핑으로 지정된 지점 (없으면 빈 목록)
     * ROOT: 전체 지점
     */
    public List<Branch> getManagedBranches(UserInfo user) {
        if (user.getRole() == UserRole.ROOT) {
            return branchRepository.findAll();
        }
        if (user.isManager()) {
            return branchRepository.findAllByCreatedBy(user);
        }
        return userBranchRepository.findAllByUser(user).stream()
                .map(UserBranch::getBranch).toList();
    }

    // ─────────────────────────────────────────────────────────────
    // 내부 헬퍼
    // ─────────────────────────────────────────────────────────────

    private Branch pickInitialBranch(UserInfo user) {
        List<Branch> managed = getManagedBranches(user);
        return managed.isEmpty() ? null : managed.get(0);
    }

    private SessionInfo buildSessionInfo(Long userSeq, String userId, String name,
                                         UserRole role, Long branchSeq, String branchName,
                                         boolean requirePasswordChange) {
        return SessionInfo.builder()
                .userSeq(userSeq)
                .userId(userId)
                .name(name)
                .role(role.name())
                .selectedBranchSeq(branchSeq)
                .selectedBranchName(branchName)
                .requirePasswordChange(requirePasswordChange)
                .build();
    }
}
