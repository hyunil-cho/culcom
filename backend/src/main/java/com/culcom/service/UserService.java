package com.culcom.service;

import com.culcom.dto.auth.PasswordChangeRequest;
import com.culcom.dto.auth.UserCreateRequest;
import com.culcom.dto.auth.UserResponse;
import com.culcom.entity.auth.UserBranch;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.UserRole;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserBranchRepository;
import com.culcom.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserInfoRepository userInfoRepository;
    private final UserBranchRepository userBranchRepository;
    private final BranchRepository branchRepository;
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
            return null;
        }

        return users.stream().map(u -> UserResponse.from(u, getBranchSeqs(u))).toList();
    }

    public UserResponse get(Long seq, Long callerUserSeq) {
        UserInfo subject = userInfoRepository.findById(callerUserSeq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));
        UserInfo user = userInfoRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));
        if (!isTargetManagedBySubject(subject, user) && !subject.getSeq().equals(user.getSeq())) {
            throw new SecurityException("조회 권한이 없습니다.");
        }
        return UserResponse.from(user, getBranchSeqs(user));
    }

    @Transactional
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
                .createdBy(creator)
                .requirePasswordChange(true);

        UserRole targetRole;
        if (UserRole.ROOT.equals(callerRole)) {
            targetRole = UserRole.BRANCH_MANAGER;
        } else if (UserRole.BRANCH_MANAGER.equals(callerRole)) {
            targetRole = UserRole.STAFF;
        } else {
            throw new SecurityException("사용자 생성 권한이 없습니다.");
        }
        builder.role(targetRole);

        UserInfo saved = userInfoRepository.save(builder.build());

        if (targetRole == UserRole.STAFF) {
            List<Branch> branches = resolveAssignableBranches(creator, request.getBranchSeqs());
            assignBranches(saved, branches);
        }

        return UserResponse.from(saved, getBranchSeqs(saved));
    }

    @Transactional
    public UserResponse update(Long seq, UserCreateRequest request, Long callerUserSeq) {
        UserInfo subject = userInfoRepository.findById(callerUserSeq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));

        UserInfo user = userInfoRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));

        if (!isTargetManagedBySubject(subject, user)) {
            throw new SecurityException("수정 권한이 없습니다.");
        }
        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setUserPassword(passwordEncoder.encode(request.getPassword()));
            // 관리자가 타인의 비밀번호를 재설정한 경우 대상은 다음 로그인 시 변경 강제
            if (!subject.getSeq().equals(user.getSeq())) {
                user.setRequirePasswordChange(true);
            }
        }
        UserInfo saved = userInfoRepository.save(user);

        if (user.getRole() == UserRole.STAFF && request.getBranchSeqs() != null) {
            List<Branch> branches = resolveAssignableBranches(subject, request.getBranchSeqs());
            replaceBranches(saved, branches);
        }
        return UserResponse.from(saved, getBranchSeqs(saved));
    }

    @Transactional
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
        userBranchRepository.deleteAllByUser(user);
        userInfoRepository.delete(user);
    }

    @Transactional
    public void changeOwnPassword(Long callerUserSeq, PasswordChangeRequest request) {
        UserInfo user = userInfoRepository.findById(callerUserSeq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getUserPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 올바르지 않습니다.");
        }
        if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new IllegalArgumentException("새 비밀번호를 입력하세요.");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getUserPassword())) {
            throw new IllegalArgumentException("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
        }
        user.setUserPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setRequirePasswordChange(false);
        userInfoRepository.save(user);
    }

    public List<Long> getBranchSeqs(UserInfo user) {
        if (user == null) return Collections.emptyList();
        return userBranchRepository.findAllByUser(user).stream()
                .map(ub -> ub.getBranch().getSeq()).toList();
    }

    private List<Branch> resolveAssignableBranches(UserInfo assigner, List<Long> branchSeqs) {
        if (branchSeqs == null || branchSeqs.isEmpty()) {
            return List.of();
        }
        List<Branch> assignerBranches;
        if (assigner.getRole() == UserRole.ROOT) {
            assignerBranches = branchRepository.findAll();
        } else {
            assignerBranches = branchRepository.findAllByCreatedBy(assigner);
        }
        Set<Long> allowed = new HashSet<>();
        for (Branch b : assignerBranches) allowed.add(b.getSeq());

        List<Branch> resolved = new ArrayList<>();
        for (Long seq : branchSeqs) {
            if (!allowed.contains(seq)) {
                throw new SecurityException("지정할 수 없는 지점이 포함되어 있습니다.");
            }
            resolved.add(branchRepository.findById(seq)
                    .orElseThrow(() -> new EntityNotFoundException("지점")));
        }
        return resolved;
    }

    private void assignBranches(UserInfo user, List<Branch> branches) {
        for (Branch b : branches) {
            userBranchRepository.save(UserBranch.builder().user(user).branch(b).build());
        }
    }

    private void replaceBranches(UserInfo user, List<Branch> branches) {
        userBranchRepository.deleteAllByUser(user);
        userBranchRepository.flush();
        assignBranches(user, branches);
    }

    private boolean isTargetManagedBySubject(UserInfo subject, UserInfo target) {
        UserRole subjectRole = subject.getRole();
        if (UserRole.ROOT.equals(subjectRole)) {
            return true;
        }
        return target.getRole().equals(UserRole.STAFF)
                && target.getCreatedBy() != null
                && target.getCreatedBy().getSeq().equals(subject.getSeq());
    }
}
