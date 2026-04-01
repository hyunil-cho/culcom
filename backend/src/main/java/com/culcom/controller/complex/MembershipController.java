package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.Membership;
import com.culcom.repository.MembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/memberships")
@RequiredArgsConstructor
public class MembershipController {

    private final MembershipRepository membershipRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Membership>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(membershipRepository.findAll()));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<Membership>> get(@PathVariable Long seq) {
        return membershipRepository.findById(seq)
                .map(m -> ResponseEntity.ok(ApiResponse.ok(m)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Membership>> create(@RequestBody Membership membership) {
        return ResponseEntity.ok(ApiResponse.ok("멤버십 추가 완료", membershipRepository.save(membership)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<Membership>> update(
            @PathVariable Long seq, @RequestBody Membership request) {
        return membershipRepository.findById(seq)
                .map(m -> {
                    m.setName(request.getName());
                    m.setDuration(request.getDuration());
                    m.setCount(request.getCount());
                    m.setPrice(request.getPrice());
                    return ResponseEntity.ok(ApiResponse.ok("멤버십 수정 완료", membershipRepository.save(m)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        membershipRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("멤버십 삭제 완료", null));
    }
}
