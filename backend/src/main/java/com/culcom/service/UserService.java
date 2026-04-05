package com.culcom.service;

import com.culcom.dto.auth.UserCreateRequest;
import com.culcom.dto.auth.UserResponse;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.enums.UserRole;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserInfoRepository userInfoRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserResponse> list(Long userSeq, UserRole role) {
        UserInfo creator = userInfoRepository.findById(userSeq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));

        List<UserInfo> users;
        if (UserRole.ROOT.equals(role)) {
            users = userInfoRepository.findAll();
        } else if (UserRole.BRANCH_MANAGER.equals(role)) {
            users = userInfoRepository.findByCreatedBy(creator);
        } else {
            return null; // controller handles 403
        }

        return users.stream().map(UserResponse::from).toList();
    }

    public UserResponse create(UserCreateRequest request, Long userSeq, UserRole callerRole) {
        UserInfo creator = userInfoRepository.findById(userSeq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));

        if (userInfoRepository.findByUserId(request.getUserId()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
        }

        var builder = UserInfo.builder()
                .userId(request.getUserId())
                .userPassword(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .phone(request.getPhone())
                .createdBy(creator);

        if (UserRole.ROOT.equals(callerRole)) {
            builder.role(UserRole.BRANCH_MANAGER);
        } else if (UserRole.BRANCH_MANAGER.equals(callerRole)) {
            builder.role(UserRole.STAFF);
        } else {
            throw new SecurityException("사용자 생성 권한이 없습니다.");
        }

        UserInfo saved = userInfoRepository.save(builder.build());
        return UserResponse.from(saved);
    }

    public UserResponse update(Long seq, UserCreateRequest request, Long callerUserSeq) {
        UserInfo subject = userInfoRepository.findById(callerUserSeq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));

        UserInfo user = userInfoRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));

        if (!isTargetManagedBySubject(subject, user)) {
            throw new SecurityException("수정 권한이 없습니다.");
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setUserPassword(passwordEncoder.encode(request.getPassword()));
        }
        return UserResponse.from(userInfoRepository.save(user));
    }

    public void delete(Long seq, Long callerUserSeq) {
        UserInfo subject = userInfoRepository.findById(callerUserSeq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));

        UserInfo user = userInfoRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));

        if (user.getRole() == UserRole.ROOT) {
            throw new IllegalArgumentException("ROOT 계정은 삭제할 수 없습니다.");
        }
        if (!isTargetManagedBySubject(subject, user)) {
            throw new SecurityException("삭제 권한이 없습니다.");
        }
        userInfoRepository.delete(user);
    }

    private boolean isTargetManagedBySubject(UserInfo subject, UserInfo target) {
        UserRole subjectRole = subject.getRole();
        if (UserRole.ROOT.equals(subjectRole)) {
            return true;
        }
        return target.getRole().equals(UserRole.STAFF) && target.getCreatedBy().equals(subject);
    }
}
