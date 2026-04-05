package com.culcom.controller.complex.staff;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.member.ComplexStaffRefundInfoRequest;
import com.culcom.dto.complex.member.ComplexStaffRefundInfoResponse;
import com.culcom.dto.complex.member.ComplexStaffRequest;
import com.culcom.dto.complex.member.ComplexStaffResponse;
import com.culcom.entity.complex.staff.ComplexStaff;
import com.culcom.entity.complex.staff.ComplexStaffRefundInfo;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexStaffRefundInfoRepository;
import com.culcom.repository.ComplexStaffRepository;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/complex/staffs")
@RequiredArgsConstructor
public class ComplexStaffController {

    private final ComplexStaffRepository staffRepository;
    private final ComplexStaffRefundInfoRepository refundInfoRepository;
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
    @Transactional
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        refundInfoRepository.deleteByStaffSeq(seq);
        staffRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("스태프 삭제 완료", null));
    }

    // ── 환급 정보 ──

    @GetMapping("/{staffSeq}/refund")
    public ResponseEntity<ApiResponse<ComplexStaffRefundInfoResponse>> getRefundInfo(@PathVariable Long staffSeq) {
        return refundInfoRepository.findByStaffSeq(staffSeq)
                .map(r -> ResponseEntity.ok(ApiResponse.ok(ComplexStaffRefundInfoResponse.from(r))))
                .orElse(ResponseEntity.ok(ApiResponse.ok(null)));
    }

    @PostMapping("/{staffSeq}/refund")
    public ResponseEntity<ApiResponse<ComplexStaffRefundInfoResponse>> createOrUpdateRefundInfo(
            @PathVariable Long staffSeq, @RequestBody ComplexStaffRefundInfoRequest req) {
        ComplexStaff staff = staffRepository.findById(staffSeq)
                .orElse(null);
        if (staff == null) return ResponseEntity.notFound().build();

        ComplexStaffRefundInfo refund = refundInfoRepository.findByStaffSeq(staffSeq)
                .orElse(ComplexStaffRefundInfo.builder().staff(staff).build());

        refund.setDepositAmount(req.getDepositAmount());
        refund.setRefundableDeposit(req.getRefundableDeposit());
        refund.setNonRefundableDeposit(req.getNonRefundableDeposit());
        refund.setRefundBank(req.getRefundBank());
        refund.setRefundAccount(req.getRefundAccount());
        refund.setRefundAmount(req.getRefundAmount());
        refund.setLastUpdateDate(LocalDateTime.now());

        return ResponseEntity.ok(ApiResponse.ok("환급 정보 저장 완료",
                ComplexStaffRefundInfoResponse.from(refundInfoRepository.save(refund))));
    }

    @DeleteMapping("/{staffSeq}/refund")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteRefundInfo(@PathVariable Long staffSeq) {
        refundInfoRepository.deleteByStaffSeq(staffSeq);
        return ResponseEntity.ok(ApiResponse.ok("환급 정보 삭제 완료", null));
    }
}
