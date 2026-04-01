package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.ComplexStaff;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexStaffRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
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
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ComplexStaff>>> list(HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        return ResponseEntity.ok(ApiResponse.ok(staffRepository.findByBranchSeq(branchSeq)));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexStaff>> get(@PathVariable Long seq) {
        return staffRepository.findById(seq)
                .map(s -> ResponseEntity.ok(ApiResponse.ok(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexStaff>> create(
            @RequestBody ComplexStaff staff, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        branchRepository.findById(branchSeq).ifPresent(staff::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("스태프 추가 완료", staffRepository.save(staff)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexStaff>> update(
            @PathVariable Long seq, @RequestBody ComplexStaff request) {
        return staffRepository.findById(seq)
                .map(staff -> {
                    staff.setName(request.getName());
                    staff.setPhoneNumber(request.getPhoneNumber());
                    staff.setEmail(request.getEmail());
                    staff.setSubject(request.getSubject());
                    staff.setStatus(request.getStatus());
                    staff.setJoinDate(request.getJoinDate());
                    staff.setComment(request.getComment());
                    staff.setInterviewer(request.getInterviewer());
                    staff.setPaymentMethod(request.getPaymentMethod());
                    return ResponseEntity.ok(ApiResponse.ok("스태프 수정 완료", staffRepository.save(staff)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        staffRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("스태프 삭제 완료", null));
    }
}
