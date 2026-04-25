package com.culcom.service;

import com.culcom.config.ZapierProperties;
import com.culcom.dto.publicapi.ZapierCustomerRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class ZapierServiceCustomerCreateSmsTest {

    @Mock ZapierProperties zapierProperties;
    @Mock BranchRepository branchRepository;
    @Mock CustomerRepository customerRepository;
    @Mock SmsService smsService;

    @InjectMocks ZapierService zapierService;

    private static final Long BRANCH_SEQ = 1L;
    private static final String BRANCH_ALIAS = "test";
    private static final String CUSTOMER_NAME = "홍길동";
    private static final String NORMALIZED_PHONE = "01012345678";

    private Branch branch;

    @BeforeEach
    void setUp() {
        branch = Branch.builder()
                .seq(BRANCH_SEQ)
                .branchName("테스트지점")
                .alias(BRANCH_ALIAS)
                .build();
        given(branchRepository.findByAlias(BRANCH_ALIAS)).willReturn(Optional.of(branch));
        given(customerRepository.save(any(Customer.class)))
                .willAnswer(inv -> {
                    Customer c = inv.getArgument(0);
                    return Customer.builder()
                            .seq(99L)
                            .name(c.getName())
                            .phoneNumber(c.getPhoneNumber())
                            .branch(c.getBranch())
                            .status(c.getStatus())
                            .build();
                });
    }

    @Test
    void Zapier_고객_생성시_고객등록_SMS_이벤트가_발송되어야_한다() {
        ZapierCustomerRequest request = new ZapierCustomerRequest();
        request.setName(CUSTOMER_NAME);
        request.setPhone("010-1234-5678");
        request.setLocation(BRANCH_ALIAS);

        zapierService.createCustomer(request);

        then(smsService).should().sendEventSmsIfConfigured(
                BRANCH_SEQ, SmsEventType.고객등록, CUSTOMER_NAME, NORMALIZED_PHONE);
    }
}
