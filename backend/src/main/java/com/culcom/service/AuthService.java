package com.culcom.service;

import com.culcom.entity.Branch;
import com.culcom.entity.UserInfo;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserInfoRepository;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserInfoRepository userInfoRepository;
    private final BranchRepository branchRepository;
    private final String USER_SEQ = "userSeq";
    private final String ROLE = "role";
    private final String CUR_BRANCH_SEQ = "selectedBranchSeq";

    /**
     * 기존 Go 앱과의 호환성을 위해 평문 비밀번호도 지원.
     * 추후 BCrypt로 전환 시 passwordEncoder.matches() 사용.
     */
    public Optional<UserInfo> authenticate(String userId, String password) {
        return userInfoRepository.findByUserId(userId)
                .filter(user -> user.getUserPassword().equals(password));
    }

    public void loginSession(HttpSession session, UserInfo user) {
        session.setAttribute(USER_SEQ, user.getSeq());
        session.setAttribute(ROLE, user.getRole());

        var auth = new UsernamePasswordAuthenticationToken(
                user.getUserId(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        session.setAttribute("SPRING_SECURITY_CONTEXT", context);
    }

    public Long getSessionUserSeq(HttpSession session) {
        return (Long) session.getAttribute(USER_SEQ);
    }

    public UserRole getSessionRole(HttpSession session) {
        return (UserRole) session.getAttribute(ROLE);
    }

    public Long getSessionBranchSeq(HttpSession session) {
        return (Long) session.getAttribute(CUR_BRANCH_SEQ);
    }

    public void setSelectedBranch(HttpSession session, Long branchSeq) {
        session.setAttribute(CUR_BRANCH_SEQ, branchSeq);
    }

    public UserInfo getUserInfo(HttpSession session){
        Long sessionUserSeq = this.getSessionUserSeq(session);
        return this.userInfoRepository.findById(sessionUserSeq).orElseThrow(()->new RuntimeException("user not found"));
    }

    /**
     * 해당 유저가 관리하는 지점 목록 조회.
     * BRANCH_MANAGER: 본인이 생성한 지점
     * STAFF: 생성자(BRANCH_MANAGER)의 지점
     * ROOT: 전체 지점
     */
    public List<Branch> getManagedBranches(UserInfo user) {
        if (user.getRole() == UserRole.ROOT) {
            return branchRepository.findAll();
        }
        UserInfo manager = user.isManager() ? user : user.getCreatedBy();
        return branchRepository.findAllByCreatedBy(manager);
    }
}
