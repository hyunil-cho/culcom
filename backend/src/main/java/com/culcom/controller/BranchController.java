package com.culcom.controller;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.Branch;
import com.culcom.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchRepository branchRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Branch>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(branchRepository.findAll()));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<Branch>> get(@PathVariable Long seq) {
        return branchRepository.findById(seq)
                .map(b -> ResponseEntity.ok(ApiResponse.ok(b)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Branch>> create(@RequestBody Branch branch) {
        return ResponseEntity.ok(ApiResponse.ok("지점 추가 완료", branchRepository.save(branch)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<Branch>> update(@PathVariable Long seq, @RequestBody Branch request) {
        return branchRepository.findById(seq)
                .map(branch -> {
                    branch.setBranchName(request.getBranchName());
                    branch.setAlias(request.getAlias());
                    branch.setBranchManager(request.getBranchManager());
                    branch.setAddress(request.getAddress());
                    branch.setDirections(request.getDirections());
                    return ResponseEntity.ok(ApiResponse.ok("지점 수정 완료", branchRepository.save(branch)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        branchRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("지점 삭제 완료", null));
    }
}
