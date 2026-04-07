package com.culcom.service;

import com.culcom.dto.complex.member.ComplexStaffRefundInfoRequest;
import com.culcom.dto.complex.member.ComplexStaffRefundInfoResponse;
import com.culcom.dto.complex.member.ComplexStaffRequest;
import com.culcom.dto.complex.member.ComplexStaffResponse;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.ComplexStaffInfo;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.ActivityFieldType;
import com.culcom.entity.enums.StaffStatus;
import com.culcom.entity.product.Membership;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ComplexStaffService {

    private final ComplexMemberRepository memberRepository;
    private final ComplexStaffInfoRepository staffInfoRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final MembershipRepository membershipRepository;
    private final ComplexClassRepository classRepository;
    private final BranchRepository branchRepository;
    private final ApplicationEventPublisher eventPublisher;

    public List<ComplexStaffResponse> list(Long branchSeq) {
        return memberRepository.findStaffByBranchSeq(branchSeq)
                .stream().map(ComplexStaffResponse::from).toList();
    }

    public ComplexStaffResponse get(Long seq) {
        ComplexMember member = memberRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("스태프"));
        return ComplexStaffResponse.from(member);
    }

    @Transactional
    public ComplexStaffResponse create(ComplexStaffRequest req, Long branchSeq) {
        ComplexMember member = ComplexMember.builder()
                .name(req.getName())
                .phoneNumber(req.getPhoneNumber())
                .interviewer(req.getInterviewer())
                .branch(branchRepository.getReferenceById(branchSeq))
                .build();
        memberRepository.save(member);

        ComplexStaffInfo staffInfo = ComplexStaffInfo.builder()
                .member(member)
                .status(req.getStatus() != null ? req.getStatus() : StaffStatus.재직)
                .build();
        member.setStaffInfo(staffInfo);

        return ComplexStaffResponse.from(memberRepository.save(member));
    }

    @Transactional
    public ComplexStaffResponse update(Long seq, ComplexStaffRequest req) {
        ComplexMember member = memberRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("스태프"));
        ComplexStaffInfo staffInfo = member.getStaffInfo();
        if (staffInfo == null) {
            staffInfo = ComplexStaffInfo.builder()
                    .member(member)
                    .status(req.getStatus() != null ? req.getStatus() : StaffStatus.재직)
                    .build();
            member.setStaffInfo(staffInfo);
            assignInternalMembership(member);
        }

        StaffStatus oldStatus = staffInfo.getStatus();
        StaffStatus newStatus = req.getStatus() != null ? req.getStatus() : oldStatus;
        if (oldStatus != newStatus) {
            eventPublisher.publishEvent(ActivityEvent.withChange(
                    member, ActivityEventType.STATUS_CHANGE, ActivityFieldType.STATUS, oldStatus.name(), newStatus.name()));
        }

        publishIfChanged(member, ActivityFieldType.NAME, member.getName(), req.getName());
        publishIfChanged(member, ActivityFieldType.PHONE_NUMBER, member.getPhoneNumber(), req.getPhoneNumber());
        publishIfChanged(member, ActivityFieldType.INTERVIEWER, member.getInterviewer(), req.getInterviewer());

        member.setName(req.getName());
        member.setPhoneNumber(req.getPhoneNumber());
        member.setInterviewer(req.getInterviewer());
        staffInfo.setStatus(newStatus);

        // 휴직/퇴직 시 배정된 수업에서 제외
        if (oldStatus == StaffStatus.재직 && newStatus != StaffStatus.재직) {
            List<ComplexClass> assignedClasses = classRepository.findByStaffSeq(seq);
            for (ComplexClass cls : assignedClasses) {
                cls.setStaff(null);
                classRepository.save(cls);
                eventPublisher.publishEvent(ActivityEvent.withChange(
                        member, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS, cls.getName(), null));
            }
        }

        return ComplexStaffResponse.from(memberRepository.save(member));
    }

    @Transactional
    public void delete(Long seq) {
        memberRepository.deleteById(seq);
    }

    public ComplexStaffRefundInfoResponse getRefundInfo(Long memberSeq) {
        return staffInfoRepository.findByMemberSeq(memberSeq)
                .map(ComplexStaffRefundInfoResponse::from)
                .orElse(null);
    }

    @Transactional
    public ComplexStaffRefundInfoResponse saveRefundInfo(Long memberSeq, ComplexStaffRefundInfoRequest req) {
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("스태프"));
        ComplexStaffInfo staffInfo = member.getStaffInfo();
        if (staffInfo == null) throw new EntityNotFoundException("스태프 정보");

        publishRefundIfChanged(member, ActivityFieldType.DEPOSIT_AMOUNT, staffInfo.getDepositAmount(), req.getDepositAmount());
        publishRefundIfChanged(member, ActivityFieldType.REFUNDABLE_DEPOSIT, staffInfo.getRefundableDeposit(), req.getRefundableDeposit());
        publishRefundIfChanged(member, ActivityFieldType.NON_REFUNDABLE_DEPOSIT, staffInfo.getNonRefundableDeposit(), req.getNonRefundableDeposit());
        publishRefundIfChanged(member, ActivityFieldType.REFUND_BANK, staffInfo.getRefundBank(), req.getRefundBank());
        publishRefundIfChanged(member, ActivityFieldType.REFUND_ACCOUNT, staffInfo.getRefundAccount(), req.getRefundAccount());
        publishRefundIfChanged(member, ActivityFieldType.REFUND_AMOUNT, staffInfo.getRefundAmount(), req.getRefundAmount());
        publishRefundIfChanged(member, ActivityFieldType.PAYMENT_METHOD, staffInfo.getPaymentMethod(), req.getPaymentMethod());

        staffInfo.setDepositAmount(req.getDepositAmount());
        staffInfo.setRefundableDeposit(req.getRefundableDeposit());
        staffInfo.setNonRefundableDeposit(req.getNonRefundableDeposit());
        staffInfo.setRefundBank(req.getRefundBank());
        staffInfo.setRefundAccount(req.getRefundAccount());
        staffInfo.setRefundAmount(req.getRefundAmount());
        staffInfo.setPaymentMethod(req.getPaymentMethod());

        return ComplexStaffRefundInfoResponse.from(staffInfoRepository.save(staffInfo));
    }

    @Transactional
    public void deleteRefundInfo(Long memberSeq) {
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("스태프"));
        eventPublisher.publishEvent(ActivityEvent.withChange(
                member, ActivityEventType.REFUND_CHANGE, ActivityFieldType.REFUND_INFO, "삭제", null));

        ComplexStaffInfo staffInfo = member.getStaffInfo();
        if (staffInfo != null) {
            staffInfo.setDepositAmount(null);
            staffInfo.setRefundableDeposit(null);
            staffInfo.setNonRefundableDeposit(null);
            staffInfo.setRefundBank(null);
            staffInfo.setRefundAccount(null);
            staffInfo.setRefundAmount(null);
            staffInfo.setPaymentMethod(null);
            staffInfoRepository.save(staffInfo);
        }
    }

    private void publishIfChanged(ComplexMember member, ActivityFieldType field, String oldVal, String newVal) {
        if (!Objects.equals(oldVal, newVal)) {
            eventPublisher.publishEvent(ActivityEvent.withChange(member, ActivityEventType.INFO_CHANGE, field, oldVal, newVal));
        }
    }

    private void publishRefundIfChanged(ComplexMember member, ActivityFieldType field, String oldVal, String newVal) {
        if (!Objects.equals(oldVal, newVal)) {
            eventPublisher.publishEvent(ActivityEvent.withChange(member, ActivityEventType.REFUND_CHANGE, field, oldVal, newVal));
        }
    }

    private void assignInternalMembership(ComplexMember member) {
        // 이미 internal 멤버십이 있으면 스킵
        boolean hasInternal = memberMembershipRepository.findByMemberSeq(member.getSeq())
                .stream().anyMatch(ComplexMemberMembership::getInternal);
        if (hasInternal) return;

        Membership staffMembership = membershipRepository.findByName("스태프 무제한")
                .orElseThrow(() -> new EntityNotFoundException("스태프 무제한 멤버십"));

        memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member)
                .membership(staffMembership)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.of(2099, 12, 31))
                .totalCount(999999)
                .internal(true)
                .build());
    }
}
