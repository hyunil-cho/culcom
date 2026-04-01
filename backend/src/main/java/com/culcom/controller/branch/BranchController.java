package com.culcom.controller.branch;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.branch.BranchDetailResponse;
import com.culcom.dto.branch.BranchListResponse;
import com.culcom.entity.Branch;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchRepository branchRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BranchListResponse>>> list(HttpSession session) {
        String role = authService.getSessionRole(session);
        List<Branch> branches;
        if (UserRole.ROOT.name().equals(role)) {
            branches = branchRepository.findAll();
        } else {
            @SuppressWarnings("unchecked")
            List<Long> branchSeqs = (List<Long>) session.getAttribute("branchSeqs");
            if (branchSeqs == null || branchSeqs.isEmpty()) {
                return ResponseEntity.ok(ApiResponse.ok(List.of()));
            }
            branches = branchRepository.findAllById(branchSeqs);
        }
        List<BranchListResponse> result = branches.stream().map(BranchListResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<BranchDetailResponse>> get(@PathVariable Long seq) {
        return branchRepository.findById(seq)
                .map(b -> ResponseEntity.ok(ApiResponse.ok(BranchDetailResponse.from(b))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BranchDetailResponse>> create(@RequestBody Branch branch, HttpSession session) {
        String role = authService.getSessionRole(session);
        if (!UserRole.ROOT.name().equals(role)) {
            return ResponseEntity.status(403).body(ApiResponse.error("지점 생성 권한이 없습니다."));
        }
        branch.setCreatedBy((String) session.getAttribute("userId"));
        return ResponseEntity.ok(ApiResponse.ok("지점 추가 완료",
                BranchDetailResponse.from(branchRepository.save(branch))));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<BranchDetailResponse>> update(
            @PathVariable Long seq, @RequestBody Branch request, HttpSession session) {
        String role = authService.getSessionRole(session);
        if (!UserRole.ROOT.name().equals(role)) {
            return ResponseEntity.status(403).body(ApiResponse.error("지점 수정 권한이 없습니다."));
        }
        return branchRepository.findById(seq)
                .map(branch -> {
                    branch.setBranchName(request.getBranchName());
                    branch.setAlias(request.getAlias());
                    branch.setBranchManager(request.getBranchManager());
                    branch.setAddress(request.getAddress());
                    branch.setDirections(request.getDirections());
                    return ResponseEntity.ok(ApiResponse.ok("지점 수정 완료",
                            BranchDetailResponse.from(branchRepository.save(branch))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq, HttpSession session) {
        String role = authService.getSessionRole(session);
        if (!UserRole.ROOT.name().equals(role)) {
            return ResponseEntity.status(403).body(ApiResponse.error("지점 삭제 권한이 없습니다."));
        }
        branchRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("지점 삭제 완료", null));
    }
}
