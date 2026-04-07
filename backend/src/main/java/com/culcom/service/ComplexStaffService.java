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
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.StaffStatus;
import com.culcom.entity.product.Membership;

import java.time.LocalDate;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ComplexStaffService {

    private final ComplexMemberRepository memberRepository;
    private final ComplexStaffInfoRepository staffInfoRepository;
    private final ComplexClassRepository classRepository;
    private final BranchRepository branchRepository;
    private final MembershipRepository membershipRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexMemberService complexMemberService;
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

        // 스태프에게 내부용 멤버십 자동 부여 (출석 등 사용처에서 사용 가능하도록)
        Membership internalMembership = membershipRepository.findFirstByIsInternalTrue()
                .orElseThrow(() -> new EntityNotFoundException("스태프 전용 내부 멤버십"));
        LocalDate today = LocalDate.now();
        ComplexMemberMembership staffMembership = ComplexMemberMembership.builder()
                .member(member)
                .membership(internalMembership)
                .startDate(today)
                .expiryDate(today.plusDays(internalMembership.getDuration()))
                .totalCount(internalMembership.getCount())
                .internal(true)
                .build();
        memberMembershipRepository.save(staffMembership);

        return ComplexStaffResponse.from(memberRepository.save(member));
    }

    @Transactional
    public ComplexStaffResponse update(Long seq, ComplexStaffRequest req) {
        ComplexMember member = memberRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("스태프"));
        ComplexStaffInfo staffInfo = member.getStaffInfo();
        if (staffInfo == null) {
            throw new IllegalStateException("일반 회원을 스태프로 전환할 수 없습니다.");
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

        // 재직 상태 변경에 따른 internal(스태프 복지) 멤버십 활성/정지 토글.
        // 환불된 멤버십은 비가역이므로 건드리지 않는다.
        //
        // invariant: 스태프는 외부 멤버십을 별도로 등록하지 않는다 (강사 자격으로만 수강).
        // 따라서 휴직/퇴직 시 기존 수업 매핑은 모두 자격을 잃었다고 보고 일괄 제거한다.
        // 복직 후에는 새 멤버십을 구매하고 팀에 다시 등록해야 한다.
        if (oldStatus != newStatus) {
            MembershipStatus newMmStatus =
                    (newStatus == StaffStatus.재직)
                            ? MembershipStatus.활성
                            : MembershipStatus.정지;
            boolean detached = false;
            for (ComplexMemberMembership mm : memberMembershipRepository.findByMemberSeqAndInternalTrue(seq)) {
                if (mm.isRefunded()) continue;
                boolean wasActive = mm.isActive();
                mm.setStatus(newMmStatus);
                memberMembershipRepository.save(mm);
                if (wasActive && !mm.isActive() && !detached) {
                    complexMemberService.detachMemberFromAllClasses(member, newMmStatus.name());
                    detached = true;
                }
            }
        }

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

}
