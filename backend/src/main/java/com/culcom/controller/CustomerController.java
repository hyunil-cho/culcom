package com.culcom.controller;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.Customer;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.CustomerRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Customer>>> list(
            HttpSession session,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "all") String filter,
            @RequestParam(required = false) String searchType,
            @RequestParam(required = false) String keyword) {

        Long branchSeq = authService.getSessionBranchSeq(session);
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
                    List.of(CustomerStatus.신규, CustomerStatus.진행중), pageable);
        } else {
            result = customerRepository.findByBranchSeq(branchSeq, pageable);
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Customer>> create(
            @RequestBody Customer customer, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        branchRepository.findById(branchSeq).ifPresent(customer::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("고객 추가 완료", customerRepository.save(customer)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<Customer>> update(
            @PathVariable Long seq, @RequestBody Customer request) {
        return customerRepository.findById(seq)
                .map(customer -> {
                    customer.setName(request.getName());
                    customer.setPhoneNumber(request.getPhoneNumber());
                    customer.setComment(request.getComment());
                    customer.setCommercialName(request.getCommercialName());
                    customer.setAdSource(request.getAdSource());
                    customer.setStatus(request.getStatus());
                    return ResponseEntity.ok(ApiResponse.ok("고객 수정 완료", customerRepository.save(customer)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        customerRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("고객 삭제 완료", null));
    }
}
