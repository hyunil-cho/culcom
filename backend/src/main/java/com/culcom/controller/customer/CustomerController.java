package com.culcom.controller.customer;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.customer.*;
import com.culcom.entity.CallerSelectionHistory;
import com.culcom.entity.Customer;
import com.culcom.entity.ReservationInfo;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.CallerSelectionHistoryRepository;
import com.culcom.repository.CustomerRepository;
import com.culcom.repository.ReservationInfoRepository;
import com.culcom.repository.UserInfoRepository;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.culcom.util.DateTimeUtils;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final BranchRepository branchRepository;
    private final CallerSelectionHistoryRepository callerSelectionHistoryRepository;
    private final ReservationInfoRepository reservationInfoRepository;
    private final UserInfoRepository userInfoRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<CustomerResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "all") String filter,
            @RequestParam(required = false) String searchType,
            @RequestParam(required = false) String keyword) {

        Long branchSeq = principal.getSelectedBranchSeq();
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdDate"));

        Page<Customer> result;
        if (keyword != null && !keyword.isBlank()) {
            if ("phone".equals(searchType)) {
                result = customerRepository.findByBranchSeqAndPhoneNumberContaining(branchSeq, keyword, pageable);
            } else {
                result = customerRepository.findByBranchSeqAndNameContaining(branchSeq, keyword, pageable);
            }
        } else if ("new".equals(filter)) {
            result = customerRepository.findByBranchSeqAndStatusIn(branchSeq,
                    java.util.List.of(CustomerStatus.신규, CustomerStatus.진행중), pageable);
        } else {
            result = customerRepository.findByBranchSeq(branchSeq, pageable);
        }

        return ResponseEntity.ok(ApiResponse.ok(result.map(CustomerResponse::from)));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<CustomerResponse>> get(@PathVariable Long seq) {
        return customerRepository.findById(seq)
                .map(customer -> ResponseEntity.ok(ApiResponse.ok(CustomerResponse.from(customer))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerResponse>> create(
            @RequestBody CustomerCreateRequest request, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        if (branchSeq == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("지점을 먼저 선택해주세요."));
        }
        Customer customer = Customer.builder()
                .name(request.getName())
                .phoneNumber(request.getPhoneNumber())
                .comment(request.getComment())
                .commercialName(request.getCommercialName())
                .adSource(request.getAdSource())
                .build();
        branchRepository.findById(branchSeq).ifPresent(customer::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("고객 추가 완료",
                CustomerResponse.from(customerRepository.save(customer))));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<CustomerResponse>> update(
            @PathVariable Long seq, @RequestBody CustomerCreateRequest request) {
        return customerRepository.findById(seq)
                .map(customer -> {
                    customer.setName(request.getName());
                    customer.setPhoneNumber(request.getPhoneNumber());
                    customer.setComment(request.getComment());
                    customer.setCommercialName(request.getCommercialName());
                    customer.setAdSource(request.getAdSource());
                    if (request.getStatus() != null) {
                        customer.setStatus(CustomerStatus.valueOf(request.getStatus()));
                    }
                    return ResponseEntity.ok(ApiResponse.ok("고객 수정 완료",
                            CustomerResponse.from(customerRepository.save(customer))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        customerRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("고객 삭제 완료", null));
    }

    @PostMapping("/update-name")
    public ResponseEntity<ApiResponse<Void>> updateName(
            @RequestBody CustomerUpdateNameRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("이름을 입력해주세요"));
        }

        return customerRepository.findById(request.getCustomerSeq())
                .map(customer -> {
                    customer.setName(request.getName());
                    customerRepository.save(customer);
                    return ResponseEntity.ok(ApiResponse.<Void>ok("이름 변경 완료", null));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/comment")
    public ResponseEntity<ApiResponse<CustomerCommentResponse>> updateComment(
            @RequestBody CustomerCommentRequest request) {
        return customerRepository.findById(request.getCustomerSeq())
                .map(customer -> {
                    customer.setComment(request.getComment());
                    customerRepository.save(customer);
                    String comment = request.getComment() != null ? request.getComment() : "";
                    return ResponseEntity.ok(ApiResponse.ok("코멘트 업데이트 완료",
                            new CustomerCommentResponse(comment)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/process-call")
    @Transactional
    public ResponseEntity<ApiResponse<CustomerProcessCallResponse>> processCall(
            @RequestBody CustomerProcessCallRequest request, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();

        if (request.getCaller() == null || request.getCaller().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Caller를 선택해주세요"));
        }

        Customer customer = customerRepository.findById(request.getCustomerSeq())
                .orElse(null);
        if (customer == null) {
            return ResponseEntity.notFound().build();
        }

        callerSelectionHistoryRepository.save(CallerSelectionHistory.builder()
                .customer(customer)
                .caller(request.getCaller())
                .branch(branchRepository.getReferenceById(branchSeq))
                .build());

        int newCallCount = customer.getCallCount() + 1;
        customer.setCallCount(newCallCount);
        customer.setLastUpdateDate(LocalDateTime.now());

        if (newCallCount >= 5) {
            customer.setStatus(CustomerStatus.콜수초과);
        } else if (customer.getStatus() == CustomerStatus.신규) {
            customer.setStatus(CustomerStatus.진행중);
        }

        customerRepository.save(customer);

        String lastUpdateDate = DateTimeUtils.format(customer.getLastUpdateDate());

        return ResponseEntity.ok(ApiResponse.ok("통화 처리 완료",
                CustomerProcessCallResponse.builder()
                        .callCount(newCallCount)
                        .lastUpdateDate(lastUpdateDate)
                        .build()));
    }

    @PostMapping("/reservation")
    @Transactional
    public ResponseEntity<ApiResponse<CustomerReservationResponse>> createReservation(
            @RequestBody CustomerReservationRequest request, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        Long userSeq = principal.getUserSeq();

        if (request.getCaller() == null || request.getCaller().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Caller를 선택해주세요"));
        }
        if (request.getInterviewDate() == null || request.getInterviewDate().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("인터뷰 일시를 입력해주세요"));
        }

        Customer customer = customerRepository.findById(request.getCustomerSeq()).orElse(null);
        if (customer == null) {
            return ResponseEntity.notFound().build();
        }

        LocalDateTime interviewDate = DateTimeUtils.parse(request.getInterviewDate());

        ReservationInfo reservation = ReservationInfo.builder()
                .branch(branchRepository.getReferenceById(branchSeq))
                .customer(customer)
                .user(userInfoRepository.getReferenceById(userSeq))
                .caller(request.getCaller())
                .interviewDate(interviewDate)
                .build();
        reservationInfoRepository.save(reservation);

        customer.setStatus(CustomerStatus.예약확정);
        customerRepository.save(customer);

        return ResponseEntity.ok(ApiResponse.ok("예약이 생성되었습니다",
                CustomerReservationResponse.builder()
                        .reservationId(reservation.getSeq())
                        .customerSeq(request.getCustomerSeq())
                        .interviewDate(DateTimeUtils.format(interviewDate))
                        .build()));
    }

    @PostMapping("/mark-no-phone-interview")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> markNoPhoneInterview(
            @RequestBody CustomerSeqRequest request) {
        return customerRepository.findById(request.getCustomerSeq())
                .map(customer -> {
                    customer.setStatus(CustomerStatus.전화상거절);
                    customer.setLastUpdateDate(LocalDateTime.now());
                    customerRepository.save(customer);
                    return ResponseEntity.ok(ApiResponse.<Void>ok("전화상안함으로 처리되었습니다", null));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
