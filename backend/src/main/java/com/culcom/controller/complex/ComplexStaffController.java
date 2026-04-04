package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.member.ComplexStaffRequest;
import com.culcom.dto.complex.member.ComplexStaffResponse;
import com.culcom.entity.complex.staff.ComplexStaff;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexStaffRepository;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/staffs")
@RequiredArgsConstructor
public class ComplexStaffController {

    private final ComplexStaffRepository staffRepository;
    private final BranchRepository branchRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ComplexStaffResponse>>> list(@AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        List<ComplexStaffResponse> result = staffRepository.findByBranchSeq(branchSeq)
                .stream().map(ComplexStaffResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexStaffResponse>> get(@PathVariable Long seq) {
        return staffRepository.findById(seq)
                .map(s -> ResponseEntity.ok(ApiResponse.ok(ComplexStaffResponse.from(s))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexStaffResponse>> create(
            @RequestBody ComplexStaffRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        ComplexStaff staff = ComplexStaff.builder()
                .name(req.getName())
                .phoneNumber(req.getPhoneNumber())
                .email(req.getEmail())
                .subject(req.getSubject())
                .status(req.getStatus())
                .joinDate(req.getJoinDate())
                .comment(req.getComment())
                .interviewer(req.getInterviewer())
                .paymentMethod(req.getPaymentMethod())
                .branch(branchRepository.getReferenceById(branchSeq))
                .build();
        return ResponseEntity.ok(ApiResponse.ok("스태프 추가 완료", ComplexStaffResponse.from(staffRepository.save(staff))));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexStaffResponse>> update(
            @PathVariable Long seq, @RequestBody ComplexStaffRequest req) {
        return staffRepository.findById(seq)
                .map(staff -> {
                    staff.setName(req.getName());
                    staff.setPhoneNumber(req.getPhoneNumber());
                    staff.setEmail(req.getEmail());
                    staff.setSubject(req.getSubject());
                    staff.setStatus(req.getStatus());
                    staff.setJoinDate(req.getJoinDate());
                    staff.setComment(req.getComment());
                    staff.setInterviewer(req.getInterviewer());
                    staff.setPaymentMethod(req.getPaymentMethod());
                    return ResponseEntity.ok(ApiResponse.ok("스태프 수정 완료", ComplexStaffResponse.from(staffRepository.save(staff))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        staffRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("스태프 삭제 완료", null));
    }
}
