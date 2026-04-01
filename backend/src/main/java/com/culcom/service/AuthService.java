package com.culcom.service;

import com.culcom.entity.UserInfo;
import com.culcom.entity.enums.UserRole;
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

    /**
     * 기존 Go 앱과의 호환성을 위해 평문 비밀번호도 지원.
     * 추후 BCrypt로 전환 시 passwordEncoder.matches() 사용.
     */
    public Optional<UserInfo> authenticate(String userId, String password) {
        return userInfoRepository.findByUserId(userId)
                .filter(user -> user.getUserPassword().equals(password));
    }

    public void loginSession(HttpSession session, UserInfo user) {
        session.setAttribute("userSeq", user.getSeq());
        session.setAttribute("userId", user.getUserId());
        session.setAttribute("role", user.getRole().name());
        session.setAttribute("branchSeqs",
                user.getBranches().stream().map(b -> b.getSeq()).toList());

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
        return (Long) session.getAttribute("userSeq");
    }

    public String getSessionRole(HttpSession session) {
        return (String) session.getAttribute("role");
    }

    public Long getSessionBranchSeq(HttpSession session) {
        return (Long) session.getAttribute("selectedBranchSeq");
    }

    public void setSelectedBranch(HttpSession session, Long branchSeq) {
        session.setAttribute("selectedBranchSeq", branchSeq);
    }
}
