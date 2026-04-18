package com.culcom.service;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.auth.UserBranch;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserBranchRepository;
import com.culcom.repository.UserInfoRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
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
}