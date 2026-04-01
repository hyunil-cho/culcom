package com.culcom.service;

import com.culcom.entity.UserInfo;
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
        session.setAttribute("branchSeq", user.getBranch() != null ? user.getBranch().getSeq() : null);

        var auth = new UsernamePasswordAuthenticationToken(
                user.getUserId(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    public Long getSessionUserSeq(HttpSession session) {
        return (Long) session.getAttribute("userSeq");
    }

    public Long getSessionBranchSeq(HttpSession session) {
        return (Long) session.getAttribute("selectedBranchSeq");
    }

    public void setSelectedBranch(HttpSession session, Long branchSeq) {
        session.setAttribute("selectedBranchSeq", branchSeq);
    }
}
