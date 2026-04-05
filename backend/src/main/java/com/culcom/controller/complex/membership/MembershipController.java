package com.culcom.controller.complex.membership;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.member.MembershipRequest;
import com.culcom.dto.complex.member.MembershipResponse;
import com.culcom.service.MembershipService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/memberships")
@RequiredArgsConstructor
public class MembershipController {

    private final MembershipService membershipService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MembershipResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(membershipService.list()));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<MembershipResponse>> get(@PathVariable Long seq) {
        return ResponseEntity.ok(ApiResponse.ok(membershipService.get(seq)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MembershipResponse>> create(@Valid @RequestBody MembershipRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("멤버십 추가 완료", membershipService.create(req)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<MembershipResponse>> update(
            @PathVariable Long seq, @RequestBody MembershipRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("멤버십 수정 완료", membershipService.update(seq, req)));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        membershipService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("멤버십 삭제 완료", null));
    }
}
