package com.culcom.service;

import com.culcom.dto.customer.*;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.reservation.CallerSelectionHistory;
import com.culcom.entity.reservation.ReservationInfo;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import com.culcom.repository.board.BoardAccountRepository;
import com.culcom.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final BranchRepository branchRepository;
    private final CallerSelectionHistoryRepository callerSelectionHistoryRepository;
    private final ReservationInfoRepository reservationInfoRepository;
    private final UserInfoRepository userInfoRepository;
    private final BoardAccountRepository boardAccountRepository;
    private final CustomerConsentHistoryRepository customerConsentHistoryRepository;
    private final TransferRequestRepository transferRequestRepository;
    private final KakaoOAuthService kakaoOAuthService;
    private final SmsService smsService;

    public CustomerResponse get(Long seq) {
        Customer customer = customerRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("고객"));
        return CustomerResponse.from(customer);
    }

    @Transactional
    public CustomerResponse create(CustomerCreateRequest request, Long branchSeq) {
        Customer customer = Customer.builder()
                .name(request.getName())
                .phoneNumber(request.getPhoneNumber())
                .comment(request.getComment())
                .commercialName(request.getCommercialName())
                .adSource(request.getAdSource())
                .build();
        branchRepository.findById(branchSeq).ifPresent(customer::setBranch);
        Customer saved = customerRepository.save(customer);

        String smsWarning = smsService.sendEventSmsIfConfigured(branchSeq, SmsEventType.고객등록,
                saved.getName(), saved.getPhoneNumber());

        CustomerResponse response = CustomerResponse.from(saved);
        response.setSmsWarning(smsWarning);
        return response;
    }

    @Transactional
    public CustomerResponse update(Long seq, CustomerCreateRequest request) {
        Customer customer = customerRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("고객"));
        customer.setName(request.getName());
        customer.setPhoneNumber(request.getPhoneNumber());
        customer.setComment(request.getComment());
        customer.setCommercialName(request.getCommercialName());
        customer.setAdSource(request.getAdSource());
        if (request.getStatus() != null) {
            customer.setStatus(CustomerStatus.valueOf(request.getStatus()));
        }
        return CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional
    public void delete(Long seq) {
        Customer customer = customerRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("고객"));
        Long kakaoId = customer.getKakaoId();

        // Customer 를 참조하는 자식 레코드들을 먼저 삭제한다
        boardAccountRepository.deleteByCustomerSeq(seq);
        customerConsentHistoryRepository.deleteByCustomerSeq(seq);
        callerSelectionHistoryRepository.deleteByCustomerSeq(seq);
        reservationInfoRepository.deleteByCustomerSeq(seq);
        transferRequestRepository.deleteByToCustomerSeq(seq);

        customerRepository.delete(customer);
        customerRepository.flush();
        if (kakaoId != null) {
            kakaoOAuthService.unlinkUser(kakaoId);
        }
    }

    @Transactional
    public void updateName(Long customerSeq, String name) {
        Customer customer = customerRepository.findById(customerSeq)
                .orElseThrow(() -> new EntityNotFoundException("고객"));
        customer.setName(name);
        customerRepository.save(customer);
    }

    @Transactional
    public CustomerCommentResponse updateComment(Long customerSeq, String comment) {
        Customer customer = customerRepository.findById(customerSeq)
                .orElseThrow(() -> new EntityNotFoundException("고객"));
        customer.setComment(comment);
        customerRepository.save(customer);
        return new CustomerCommentResponse(comment != null ? comment : "");
    }

    @Transactional
    public CustomerProcessCallResponse processCall(Long customerSeq, String caller, Long branchSeq) {
        Customer customer = customerRepository.findById(customerSeq)
                .orElseThrow(() -> new EntityNotFoundException("고객"));

        callerSelectionHistoryRepository.save(CallerSelectionHistory.builder()
                .customer(customer)
                .caller(caller)
                .branch(branchRepository.getReferenceById(branchSeq))
                .build());

        int newCallCount = customer.getCallCount() + 1;
        customer.setCallCount(newCallCount);

        if (newCallCount >= 5) {
            customer.setStatus(CustomerStatus.콜수초과);
        } else if (customer.getStatus() == CustomerStatus.신규) {
            customer.setStatus(CustomerStatus.진행중);
        }

        customerRepository.save(customer);

        return CustomerProcessCallResponse.builder()
                .callCount(newCallCount)
                .lastUpdateDate(DateTimeUtils.format(customer.getLastUpdateDate()))
                .build();
    }

    @Transactional
    public CustomerReservationResponse createReservation(
            Long customerSeq, String caller, String interviewDateStr, Long branchSeq, Long userSeq) {
        Customer customer = customerRepository.findById(customerSeq)
                .orElseThrow(() -> new EntityNotFoundException("고객"));

        LocalDateTime interviewDate = DateTimeUtils.parse(interviewDateStr);

        ReservationInfo reservation = ReservationInfo.builder()
                .branch(branchRepository.getReferenceById(branchSeq))
                .customer(customer)
                .user(userInfoRepository.getReferenceById(userSeq))
                .caller(caller)
                .interviewDate(interviewDate)
                .build();
        reservationInfoRepository.save(reservation);

        customer.setStatus(CustomerStatus.예약확정);
        customerRepository.save(customer);

        String formattedInterviewDate = DateTimeUtils.format(interviewDate);
        String smsWarning = smsService.sendEventSmsIfConfigured(
                branchSeq, SmsEventType.예약확정, customer.getName(), customer.getPhoneNumber(),
                Map.of(
                        "{reservation.interview_date}", formattedInterviewDate,
                        "{reservation.interview_datetime}", formattedInterviewDate));

        return CustomerReservationResponse.builder()
                .reservationId(reservation.getSeq())
                .customerSeq(customerSeq)
                .interviewDate(formattedInterviewDate)
                .smsWarning(smsWarning)
                .build();
    }

    @Transactional
    public void markNoPhoneInterview(Long customerSeq) {
        Customer customer = customerRepository.findById(customerSeq)
                .orElseThrow(() -> new EntityNotFoundException("고객"));
        customer.setStatus(CustomerStatus.전화상거절);
        customerRepository.save(customer);
    }

    public Customer findById(Long seq) {
        return customerRepository.findById(seq).orElse(null);
    }

}
