package com.culcom.controller.customer;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.customer.*;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<CustomerResponse>> get(@PathVariable Long seq) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.get(seq)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerResponse>> create(
            @Valid @RequestBody CustomerCreateRequest request, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        if (branchSeq == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("지점을 먼저 선택해주세요."));
        }
        return ResponseEntity.ok(ApiResponse.ok("고객 추가 완료", customerService.create(request, branchSeq)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<CustomerResponse>> update(
            @PathVariable Long seq, @RequestBody CustomerCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("고객 수정 완료", customerService.update(seq, request)));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        customerService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("고객 삭제 완료", null));
    }

    @PostMapping("/update-name")
    public ResponseEntity<ApiResponse<Void>> updateName(@Valid @RequestBody CustomerUpdateNameRequest request) {
        customerService.updateName(request.getCustomerSeq(), request.getName());
        return ResponseEntity.ok(ApiResponse.<Void>ok("이름 변경 완료", null));
    }

    @PostMapping("/comment")
    public ResponseEntity<ApiResponse<CustomerCommentResponse>> updateComment(@Valid @RequestBody CustomerCommentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("코멘트 업데이트 완료",
                customerService.updateComment(request.getCustomerSeq(), request.getComment())));
    }

    @PostMapping("/process-call")
    public ResponseEntity<ApiResponse<CustomerProcessCallResponse>> processCall(
            @Valid @RequestBody CustomerProcessCallRequest request, @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok("통화 처리 완료",
                customerService.processCall(request.getCustomerSeq(), request.getCaller(), principal.getSelectedBranchSeq())));
    }

    @PostMapping("/reservation")
    public ResponseEntity<ApiResponse<CustomerReservationResponse>> createReservation(
            @Valid @RequestBody CustomerReservationRequest request, @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok("예약이 생성되었습니다",
                customerService.createReservation(request.getCustomerSeq(), request.getCaller(),
                        request.getInterviewDate(), principal.getSelectedBranchSeq(), principal.getUserSeq())));
    }

    @PostMapping("/mark-no-phone-interview")
    public ResponseEntity<ApiResponse<Void>> markNoPhoneInterview(@Valid @RequestBody CustomerSeqRequest request) {
        customerService.markNoPhoneInterview(request.getCustomerSeq());
        return ResponseEntity.ok(ApiResponse.ok("전화상안함으로 처리되었습니다", null));
    }
}
