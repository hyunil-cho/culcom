package com.culcom.controller.auth;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.auth.UserCreateRequest;
import com.culcom.dto.auth.UserResponse;
import com.culcom.entity.Branch;
import com.culcom.entity.UserInfo;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserInfoRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
        String role = authService.getSessionRole(session);

        List<UserInfo> users;
        if (UserRole.ROOT.name().equals(role)) {
            users = userInfoRepository.findAll();
        } else if (UserRole.BRANCH_MANAGER.name().equals(role)) {
            Long branchSeq = authService.getSessionBranchSeq(session);
            users = userInfoRepository.findByBranchSeqAndRole(branchSeq, UserRole.STAFF);
        } else {
            return ResponseEntity.status(403).body(ApiResponse.error("사용자 조회 권한이 없습니다."));
        }

        List<UserResponse> result = users.stream().map(UserResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(
            @Valid @RequestBody UserCreateRequest request, HttpSession session) {
        String role = authService.getSessionRole(session);
        Long callerSeq = authService.getSessionUserSeq(session);

        if (userInfoRepository.findByUserId(request.getUserId()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("이미 존재하는 아이디입니다."));
        }

        var builder = UserInfo.builder()
                .userId(request.getUserId())
                .userPassword(request.getPassword())
                .createdBy(userInfoRepository.findById(callerSeq).orElse(null));

        if (UserRole.ROOT.name().equals(role)) {
            // ROOT → BRANCH_MANAGER 생성
            if (request.getBranchSeqs() == null || request.getBranchSeqs().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("지점을 지정해주세요."));
            }
            List<Branch> branches = branchRepository.findAllById(request.getBranchSeqs());
            if (branches.size() != request.getBranchSeqs().size()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("존재하지 않는 지점이 포함되어 있습니다."));
            }
            builder.role(UserRole.BRANCH_MANAGER).branches(branches);
        } else if (UserRole.BRANCH_MANAGER.name().equals(role)) {
            // BRANCH_MANAGER → STAFF 생성 (자기 지점 자동)
            Long branchSeq = authService.getSessionBranchSeq(session);
            var branch = branchRepository.findById(branchSeq);
            if (branch.isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("지점 정보를 찾을 수 없습니다."));
            }
            builder.role(UserRole.STAFF).branches(List.of(branch.get()));
        } else {
            return ResponseEntity.status(403).body(ApiResponse.error("사용자 생성 권한이 없습니다."));
        }

        UserInfo saved = userInfoRepository.save(builder.build());
        return ResponseEntity.ok(ApiResponse.ok("사용자 생성 완료", UserResponse.from(saved)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @PathVariable Long seq, @RequestBody UserCreateRequest request, HttpSession session) {
        String role = authService.getSessionRole(session);

        return userInfoRepository.findById(seq)
                .map(user -> {
                    if (!canManage(role, session, user)) {
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

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq, HttpSession session) {
        String role = authService.getSessionRole(session);

        return userInfoRepository.findById(seq)
                .map(user -> {
                    if (user.getRole() == UserRole.ROOT) {
                        return ResponseEntity.badRequest()
                                .body(ApiResponse.<Void>error("ROOT 계정은 삭제할 수 없습니다."));
                    }
                    if (!canManage(role, session, user)) {
                        return ResponseEntity.status(403)
                                .body(ApiResponse.<Void>error("삭제 권한이 없습니다."));
                    }
                    userInfoRepository.delete(user);
                    return ResponseEntity.ok(ApiResponse.<Void>ok("사용자 삭제 완료", null));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private boolean canManage(String callerRole, HttpSession session, UserInfo target) {
        if (UserRole.ROOT.name().equals(callerRole)) {
            return true;
        }
        if (UserRole.BRANCH_MANAGER.name().equals(callerRole)) {
            Long callerBranchSeq = authService.getSessionBranchSeq(session);
            return target.getRole() == UserRole.STAFF
                    && target.getBranches().stream()
                            .anyMatch(b -> b.getSeq().equals(callerBranchSeq));
        }
        return false;
    }
}
