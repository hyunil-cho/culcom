package com.culcom.controller.auth;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.auth.UserCreateRequest;
import com.culcom.dto.auth.UserResponse;
import com.culcom.entity.UserInfo;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserInfoRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserInfoRepository userInfoRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> list(HttpSession session) {
        UserRole role = authService.getSessionRole(session);
        Long callerSeq = authService.getSessionUserSeq(session);
        UserInfo creator = userInfoRepository.findById(callerSeq).orElseThrow(()->new RuntimeException("creator is not present"));

        List<UserInfo> users;
        if (UserRole.ROOT.equals(role)) {
            users = userInfoRepository.findAll();
        } else if (UserRole.BRANCH_MANAGER.equals(role)) {
            users = userInfoRepository.findByCreatedBy(creator);
        } else {
            return ResponseEntity.status(403).body(ApiResponse.error("사용자 조회 권한이 없습니다."));
        }

        List<UserResponse> result = users.stream().map(UserResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(
            @Valid @RequestBody UserCreateRequest request, HttpSession session) {
        UserRole role = authService.getSessionRole(session);
        Long callerSeq = authService.getSessionUserSeq(session);
        UserInfo creator = userInfoRepository.findById(callerSeq).orElseThrow(()->new RuntimeException("creator is not present"));

        if (userInfoRepository.findByUserId(request.getUserId()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("이미 존재하는 아이디입니다."));
        }

        var builder = UserInfo.builder()
                .userId(request.getUserId())
                .userPassword(request.getPassword())
                .name(request.getName())
                .phone(request.getPhone())
                .createdBy(creator);

        if (UserRole.ROOT.equals(role)) {
            // ROOT → BRANCH_MANAGER 생성 (지점 선택은 선택사항)
            builder.role(UserRole.BRANCH_MANAGER);
        } else if (UserRole.BRANCH_MANAGER.equals(role)) {
            builder.role(UserRole.STAFF);
        } else {
            return ResponseEntity.status(403).body(ApiResponse.error("사용자 생성 권한이 없습니다."));
        }

        UserInfo saved = userInfoRepository.save(builder.build());
        return ResponseEntity.ok(ApiResponse.ok("사용자 생성 완료", UserResponse.from(saved)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @PathVariable Long seq, @RequestBody UserCreateRequest request, HttpSession session) {
        UserInfo subject = getUserInfo(session);


        return userInfoRepository.findById(seq)
                .map(user -> {
                    if (!isTargetManagedBySubject(subject, user)) {
                        return ResponseEntity.status(403)
                                .body(ApiResponse.<UserResponse>error("수정 권한이 없습니다."));
                    }
                    if (request.getPassword() != null && !request.getPassword().isBlank()) {
                        user.setUserPassword(request.getPassword());
                    }
                    return ResponseEntity.ok(ApiResponse.ok("사용자 수정 완료",
                            UserResponse.from(userInfoRepository.save(user))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private @NonNull UserInfo getUserInfo(HttpSession session) {
        Long sessionUserSeq = authService.getSessionUserSeq(session);
        return this.userInfoRepository.findById(sessionUserSeq).orElseThrow(()->new RuntimeException("user not found"));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq, HttpSession session) {
        UserInfo subject = getUserInfo(session);

        return userInfoRepository.findById(seq)
                .map(user -> {
                    if (user.getRole() == UserRole.ROOT) {
                        return ResponseEntity.badRequest()
                                .body(ApiResponse.<Void>error("ROOT 계정은 삭제할 수 없습니다."));
                    }
                    if (!isTargetManagedBySubject(subject, user)) {
                        return ResponseEntity.status(403)
                                .body(ApiResponse.<Void>error("삭제 권한이 없습니다."));
                    }
                    userInfoRepository.delete(user);
                    return ResponseEntity.ok(ApiResponse.<Void>ok("사용자 삭제 완료", null));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private boolean isTargetManagedBySubject(UserInfo subject, UserInfo target) {
        UserRole subjectRole = subject.getRole();
        if (UserRole.ROOT.equals(subjectRole)) {
            return true;
        }
        return target.getRole().equals(UserRole.STAFF) && target.getCreatedBy().equals(subject);
    }
}
