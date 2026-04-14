package com.culcom.service;

import com.culcom.dto.customer.CustomerResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.mapper.CustomerQueryMapper;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 누적콜수 5회 이상 시 상태 변경 및 필터링 검증:
 * 1) processCall 5회 호출 → 상태가 '콜수초과'로 변경
 * 2) '콜수초과' 상태 고객은 '처리중(new)' 필터에서 조회되지 않음
 * 3) '전체(all)' 필터에서는 조회됨
 * 4) 4회까지는 '진행중' 상태 유지, '처리중' 필터에 포함
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CustomerCallCountExceedTest {

    @Autowired CustomerService customerService;
    @Autowired CustomerRepository customerRepository;
    @Autowired BranchRepository branchRepository;
    @Autowired CustomerQueryMapper customerQueryMapper;

    private Branch branch;
    private Customer customer;

    @BeforeEach
    void setUp() {
        branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("call-test-" + System.nanoTime())
                .build());

        customer = customerRepository.save(Customer.builder()
                .name("테스트고객")
                .phoneNumber("01012345678")
                .branch(branch)
                .callCount(0)
                .status(CustomerStatus.신규)
                .build());
    }

    private void processCallNTimes(int n) {
        for (int i = 0; i < n; i++) {
            customerService.processCall(customer.getSeq(), "A", branch.getSeq());
        }
    }

    private List<CustomerResponse> searchWithFilter(String filter) {
        return customerQueryMapper.search(branch.getSeq(), filter, null, null, 0, 100);
    }

    @Nested
    class 상태변경 {

        @Test
        void 콜_4회까지는_진행중_상태_유지() {
            processCallNTimes(4);

            Customer updated = customerRepository.findById(customer.getSeq()).orElseThrow();
            assertThat(updated.getCallCount()).isEqualTo(4);
            assertThat(updated.getStatus()).isEqualTo(CustomerStatus.진행중);
        }

        @Test
        void 콜_5회째에_콜수초과_상태로_변경() {
            processCallNTimes(5);

            Customer updated = customerRepository.findById(customer.getSeq()).orElseThrow();
            assertThat(updated.getCallCount()).isEqualTo(5);
            assertThat(updated.getStatus()).isEqualTo(CustomerStatus.콜수초과);
        }

        @Test
        void 콜_6회_이상에도_콜수초과_상태_유지() {
            processCallNTimes(7);

            Customer updated = customerRepository.findById(customer.getSeq()).orElseThrow();
            assertThat(updated.getCallCount()).isEqualTo(7);
            assertThat(updated.getStatus()).isEqualTo(CustomerStatus.콜수초과);
        }
    }

    @Nested
    class 처리중_필터링 {

        @Test
        void 콜_4회_고객은_처리중_필터에_포함() {
            processCallNTimes(4);

            List<CustomerResponse> results = searchWithFilter("new");
            assertThat(results).anyMatch(c -> c.getSeq().equals(customer.getSeq()));
        }

        @Test
        void 콜_5회_이상_고객은_처리중_필터에서_제외() {
            processCallNTimes(5);

            List<CustomerResponse> results = searchWithFilter("new");
            assertThat(results).noneMatch(c -> c.getSeq().equals(customer.getSeq()));
        }

        @Test
        void 콜_5회_이상_고객은_전체_필터에서는_조회됨() {
            processCallNTimes(5);

            List<CustomerResponse> results = searchWithFilter("all");
            assertThat(results).anyMatch(c -> c.getSeq().equals(customer.getSeq()));
        }
    }
}
