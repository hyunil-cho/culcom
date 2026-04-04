package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.member.MembershipRequest;
import com.culcom.dto.complex.member.MembershipResponse;
import com.culcom.entity.complex.member.Membership;
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
    public ResponseEntity<ApiResponse<List<MembershipResponse>>> list() {
        List<MembershipResponse> result = membershipRepository.findAll()
                .stream().map(MembershipResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<MembershipResponse>> get(@PathVariable Long seq) {
        return membershipRepository.findById(seq)
                .map(m -> ResponseEntity.ok(ApiResponse.ok(MembershipResponse.from(m))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MembershipResponse>> create(@RequestBody MembershipRequest req) {
        Membership membership = Membership.builder()
                .name(req.getName())
                .duration(req.getDuration())
                .count(req.getCount())
                .price(req.getPrice())
                .build();
        return ResponseEntity.ok(ApiResponse.ok("멤버십 추가 완료", MembershipResponse.from(membershipRepository.save(membership))));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<MembershipResponse>> update(
            @PathVariable Long seq, @RequestBody MembershipRequest req) {
        return membershipRepository.findById(seq)
                .map(m -> {
                    m.setName(req.getName());
                    m.setDuration(req.getDuration());
                    m.setCount(req.getCount());
                    m.setPrice(req.getPrice());
                    return ResponseEntity.ok(ApiResponse.ok("멤버십 수정 완료", MembershipResponse.from(membershipRepository.save(m))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        membershipRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("멤버십 삭제 완료", null));
    }
}
