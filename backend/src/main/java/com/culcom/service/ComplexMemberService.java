package com.culcom.service;

import com.culcom.dto.complex.member.*;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.dto.complex.member.ComplexMemberMetaDataRequest;
import com.culcom.entity.complex.member.*;
import com.culcom.entity.product.Membership;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.ActivityFieldType;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ComplexMemberService {

    private final ComplexMemberRepository memberRepository;
    private final MembershipRepository membershipRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexClassRepository classRepository;
    private final ComplexMemberClassMappingRepository classMappingRepository;
    private final BranchRepository branchRepository;
    private final ApplicationEventPublisher eventPublisher;

    public ComplexMemberResponse get(Long seq) {
        ComplexMember member = memberRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        return ComplexMemberResponse.from(member);
    }

    public List<ComplexMemberMembershipResponse> getMemberships(Long memberSeq) {
        return memberMembershipRepository.findByMemberSeqAndInternalFalse(memberSeq)
                .stream().map(ComplexMemberMembershipResponse::from).toList();
    }

    @Transactional
    public ComplexMemberResponse create(ComplexMemberRequest req, Long branchSeq) {
        ComplexMember member = ComplexMember.builder()
                .name(req.getName())
                .phoneNumber(req.getPhoneNumber())
                .info(req.getInfo())
                .chartNumber(req.getChartNumber())
                .comment(req.getComment())
                .interviewer(req.getInterviewer())
                .branch(branchRepository.getReferenceById(branchSeq))
                .build();
        memberRepository.save(member);

        eventPublisher.publishEvent(ActivityEvent.of(member, ActivityEventType.MEMBER_CREATE, "회원 등록: " + member.getName()));

        return ComplexMemberResponse.from(member);
    }

    @Transactional
    public ComplexMemberResponse update(Long seq, ComplexMemberRequest req) {
        ComplexMember member = memberRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        publishIfChanged(member, ActivityFieldType.NAME, member.getName(), req.getName());
        publishIfChanged(member, ActivityFieldType.PHONE_NUMBER, member.getPhoneNumber(), req.getPhoneNumber());
        publishIfChanged(member, ActivityFieldType.INTERVIEWER, member.getInterviewer(), req.getInterviewer());

        member.setName(req.getName());
        member.setPhoneNumber(req.getPhoneNumber());
        member.setInfo(req.getInfo());
        member.setChartNumber(req.getChartNumber());
        member.setComment(req.getComment());
        member.setInterviewer(req.getInterviewer());
        return ComplexMemberResponse.from(memberRepository.save(member));
    }

    @Transactional
    public ComplexMemberResponse updateMetaData(Long seq, ComplexMemberMetaDataRequest req) {
        ComplexMember member = memberRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        ComplexMemberMetaData metaData = member.getMetaData();
        if (metaData == null) {
            metaData = ComplexMemberMetaData.builder().member(member).build();
            member.setMetaData(metaData);
        }
        metaData.setLevel(req.getLevel());
        metaData.setLanguage(req.getLanguage());
        metaData.setSignupChannel(req.getSignupChannel());
        return ComplexMemberResponse.from(memberRepository.save(member));
    }

    @Transactional
    public void delete(Long seq) {
        memberRepository.deleteById(seq);
    }

    @Transactional
    public ComplexMemberMembershipResponse updateMembership(Long memberSeq, Long mmSeq, ComplexMemberMembershipRequest req) {
        ComplexMemberMembership mm = findOwnedMembership(memberSeq, mmSeq);

        if (req.getStartDate() != null) mm.setStartDate(req.getStartDate());
        if (req.getExpiryDate() != null) mm.setExpiryDate(req.getExpiryDate());
        if (req.getPrice() != null) mm.setPrice(req.getPrice());
        if (req.getPaymentMethod() != null) mm.setPaymentMethod(req.getPaymentMethod());
        if (req.getPaymentDate() != null) mm.setPaymentDate(req.getPaymentDate());
        Boolean oldActive = mm.getIsActive();
        if (req.getIsActive() != null) {
            if (Boolean.TRUE.equals(req.getIsActive()) && !Boolean.TRUE.equals(oldActive)
                    && memberMembershipRepository.existsActiveByMemberSeqExcluding(memberSeq, mmSeq)) {
                throw new IllegalStateException("이미 활성화된 멤버십이 존재합니다");
            }
            mm.setIsActive(req.getIsActive());
        }

        memberMembershipRepository.save(mm);

        if (!Objects.equals(oldActive, mm.getIsActive())) {
            eventPublisher.publishEvent(ActivityEvent.withMembershipChange(
                    mm.getMember(), ActivityEventType.MEMBERSHIP_UPDATE, mm.getSeq(),
                    ActivityFieldType.STATUS,
                    Boolean.TRUE.equals(oldActive) ? "사용가능" : "사용불가",
                    Boolean.TRUE.equals(mm.getIsActive()) ? "사용가능" : "사용불가"));
        }

        return ComplexMemberMembershipResponse.from(mm);
    }

    @Transactional
    public void deleteMembership(Long memberSeq, Long mmSeq) {
        ComplexMemberMembership mm = findOwnedMembership(memberSeq, mmSeq);
        eventPublisher.publishEvent(ActivityEvent.ofMembership(
                mm.getMember(), ActivityEventType.MEMBERSHIP_DELETE, mm.getSeq(),
                mm.getMembership().getName() + " 멤버십 삭제"));

        memberMembershipRepository.delete(mm);
    }

    @Transactional
    public ComplexMemberMembershipResponse assignMembership(Long memberSeq, ComplexMemberMembershipRequest req) {
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        Membership membership = membershipRepository.findById(req.getMembershipSeq())
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));

        LocalDate startDate = req.getStartDate() != null ? req.getStartDate() : LocalDate.now();
        LocalDate expiryDate = req.getExpiryDate() != null
                ? req.getExpiryDate() : startDate.plusDays(membership.getDuration());
        LocalDateTime paymentDate = req.getPaymentDate();

        boolean isActive = req.getIsActive() != null ? req.getIsActive() : true;
        if (isActive && memberMembershipRepository.existsActiveByMemberSeq(memberSeq)) {
            throw new IllegalStateException("이미 활성화된 멤버십이 존재합니다");
        }

        ComplexMemberMembership mm = ComplexMemberMembership.builder()
                .member(member)
                .membership(membership)
                .startDate(startDate)
                .expiryDate(expiryDate)
                .totalCount(membership.getCount())
                .price(req.getPrice())
                .paymentMethod(req.getPaymentMethod())
                .paymentDate(paymentDate)
                .isActive(isActive)
                .build();

        if (member.getJoinDate() == null) {
            member.setJoinDate(startDate.atStartOfDay());
            memberRepository.save(member);
        }

        memberMembershipRepository.save(mm);

        // 첫 납부(디포짓) 자동 생성
        Long initialAmount = parseAmount(req.getDepositAmount());
        if (initialAmount != null && initialAmount > 0) {
            MembershipPayment first = MembershipPayment.builder()
                    .memberMembership(mm)
                    .amount(initialAmount)
                    .paidDate(paymentDate != null ? paymentDate : LocalDateTime.now())
                    .method(req.getPaymentMethod())
                    .kind(PaymentKind.DEPOSIT)
                    .note("멤버십 등록 시 첫 납부")
                    .build();
            mm.getPayments().add(first);
            memberMembershipRepository.save(mm);
        }

        eventPublisher.publishEvent(ActivityEvent.ofMembership(
                member, ActivityEventType.MEMBERSHIP_ASSIGN, mm.getSeq(),
                membership.getName() + " 멤버십 등록"));

        return ComplexMemberMembershipResponse.from(mm);
    }

    private static Long parseAmount(String s) {
        if (s == null) return null;
        String digits = s.replaceAll("[^0-9-]", "");
        if (digits.isEmpty() || "-".equals(digits)) return null;
        try { return Long.parseLong(digits); } catch (NumberFormatException e) { return null; }
    }


    @Transactional
    public void assignClass(Long memberSeq, Long classSeq) {
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        ComplexClass clazz = classRepository.findById(classSeq)
                .orElseThrow(() -> new EntityNotFoundException("수업"));

        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(member)
                .complexClass(clazz)
                .build());

        eventPublisher.publishEvent(ActivityEvent.withChange(
                member, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS, null, clazz.getName()));
    }

    @Transactional
    public void reassignClass(Long memberSeq, Long classSeq) {
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        ComplexClass clazz = classRepository.findById(classSeq)
                .orElseThrow(() -> new EntityNotFoundException("수업"));

        List<ComplexMemberClassMapping> oldMappings = classMappingRepository.findByMemberSeq(memberSeq);
        String oldClassName = oldMappings.isEmpty() ? null : oldMappings.get(0).getComplexClass().getName();

        classMappingRepository.deleteByMemberSeq(memberSeq);
        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(member)
                .complexClass(clazz)
                .build());

        eventPublisher.publishEvent(ActivityEvent.withChange(
                member, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS, oldClassName, clazz.getName()));
    }

    public List<ComplexMemberClassMapping> getClassMappings(Long memberSeq) {
        return classMappingRepository.findByMemberSeq(memberSeq);
    }

    private ComplexMemberMembership findOwnedMembership(Long memberSeq, Long mmSeq) {
        ComplexMemberMembership mm = memberMembershipRepository.findById(mmSeq)
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));
        if (mm.getMember() == null || !mm.getMember().getSeq().equals(memberSeq)) {
            throw new EntityNotFoundException("멤버십");
        }
        return mm;
    }

    private void publishIfChanged(ComplexMember member, ActivityFieldType field, String oldVal, String newVal) {
        if (!Objects.equals(oldVal, newVal)) {
            eventPublisher.publishEvent(ActivityEvent.withChange(member, ActivityEventType.INFO_CHANGE, field, oldVal, newVal));
        }
    }
}
