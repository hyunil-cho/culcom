package com.culcom.service;

import com.culcom.dto.complex.member.*;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.dto.complex.member.ComplexMemberMetaDataRequest;
import com.culcom.entity.complex.member.*;
import com.culcom.mapper.ComplexMemberQueryMapper;
import com.culcom.entity.product.Membership;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.util.PriceUtils;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.ActivityFieldType;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ComplexMemberService {

    private final ComplexMemberRepository memberRepository;
    private final MembershipRepository membershipRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final ComplexClassRepository classRepository;
    private final ComplexMemberClassMappingRepository classMappingRepository;
    private final BranchRepository branchRepository;
    private final ComplexMemberQueryMapper complexMemberQueryMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final SmsService smsService;

    public ComplexMemberResponse get(Long seq) {
        ComplexMember member = memberRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        return ComplexMemberResponse.from(member);
    }

    @Transactional(readOnly = true)
    public List<ComplexMemberMembershipResponse> getMemberships(Long memberSeq) {
        return memberMembershipRepository.findByMemberSeqAndInternalFalse(memberSeq)
                .stream().map(mm -> ComplexMemberMembershipResponse.from(mm, true)).toList();
    }

    @Transactional
    public ComplexMemberResponse create(ComplexMemberRequest req, Long branchSeq) {
        ComplexMember member = ComplexMember.builder()
                .name(req.getName())
                .phoneNumber(req.getPhoneNumber())
                .info(req.getInfo())
                .comment(req.getComment())
                .branch(branchRepository.getReferenceById(branchSeq))
                .build();
        memberRepository.save(member);

        eventPublisher.publishEvent(ActivityEvent.of(member, ActivityEventType.MEMBER_CREATE, "회원 등록: " + member.getName()));

        String smsWarning = smsService.sendEventSmsIfConfigured(branchSeq, SmsEventType.회원등록,
                member.getName(), member.getPhoneNumber());

        ComplexMemberResponse response = ComplexMemberResponse.from(member);
        response.setSmsWarning(smsWarning);
        return response;
    }

    @Transactional
    public ComplexMemberResponse update(Long seq, ComplexMemberRequest req) {
        ComplexMember member = memberRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        // 회원 기본정보(이름/연락처/특이사항 등) 변경은 활동 히스토리에 남기지 않는다.
        member.setName(req.getName());
        member.setPhoneNumber(req.getPhoneNumber());
        member.setInfo(req.getInfo());
        member.setComment(req.getComment());
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
        MembershipStatus oldStatus = mm.getStatus();
        boolean wasActive = mm.isActive();
        if (req.getStatus() != null) {
            if (req.getStatus() == MembershipStatus.활성 && !wasActive
                    && memberMembershipRepository.existsActiveByMemberSeqExcluding(memberSeq, mmSeq)) {
                throw new IllegalStateException("이미 활성화된 멤버십이 존재합니다");
            }
            mm.setStatus(req.getStatus());
        }

        memberMembershipRepository.save(mm);

        if (!Objects.equals(oldStatus, mm.getStatus())) {
            eventPublisher.publishEvent(ActivityEvent.withMembershipChange(
                    mm.getMember(), ActivityEventType.MEMBERSHIP_UPDATE, mm.getSeq(),
                    ActivityFieldType.STATUS,
                    oldStatus != null ? oldStatus.name() : null,
                    mm.getStatus() != null ? mm.getStatus().name() : null));
        }

        // 활성 → 정지/환불로 전이된 경우 소속 팀/수업에서 자동 제외
        if (wasActive && !mm.isActive()) {
            detachMemberFromAllClasses(mm.getMember(), mm.getStatus().name());
        }

        return ComplexMemberMembershipResponse.from(mm);
    }

    /**
     * 회원의 모든 수업 매핑(complex_member_class_mapping)을 일괄 삭제한다.
     * 멤버십이 정지/환불되어 더 이상 수업을 들을 자격이 없을 때 호출한다.
     * 정지가 풀려도 자동 복구는 하지 않으며, 사용자가 수동으로 재배정해야 한다.
     */
    @Transactional
    public void detachMemberFromAllClasses(ComplexMember member, String reasonLabel) {
        List<ComplexMemberClassMapping> mappings = classMappingRepository.findByMemberSeq(member.getSeq());
        if (mappings.isEmpty()) return;
        int count = mappings.size();
        classMappingRepository.deleteByMemberSeq(member.getSeq());
        eventPublisher.publishEvent(ActivityEvent.of(
                member, ActivityEventType.CLASS_ASSIGN,
                "멤버십 " + reasonLabel + "(으)로 인한 수업/팀 자동 제외 (" + count + "건)"));
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

        MembershipStatus status = req.getStatus() != null ? req.getStatus() : MembershipStatus.활성;
        boolean willBeActive = status == MembershipStatus.활성;
        if (willBeActive && memberMembershipRepository.existsActiveByMemberSeq(memberSeq)) {
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
                .status(status)
                .build();

        if (member.getJoinDate() == null) {
            member.setJoinDate(startDate.atStartOfDay());
            memberRepository.save(member);
        }

        memberMembershipRepository.save(mm);

        // 첫 납부(디포짓) 자동 생성
        Long initialAmount = PriceUtils.parse(req.getDepositAmount());
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

    @Transactional(readOnly = true)
    public List<MembershipPaymentResponse> listPayments(Long memberSeq, Long mmSeq) {
        findOwnedMembership(memberSeq, mmSeq);
        return paymentRepository.findByMemberMembershipSeqOrderByPaidDateAscSeqAsc(mmSeq)
                .stream().map(MembershipPaymentResponse::from).toList();
    }

    @Transactional
    public MembershipPaymentResponse addPayment(Long memberSeq, Long mmSeq, MembershipPaymentRequest req) {
        ComplexMemberMembership mm = findOwnedMembership(memberSeq, mmSeq);

        if (req.getAmount() == null || req.getAmount() == 0L) {
            throw new IllegalArgumentException("금액은 0이 될 수 없습니다");
        }
        if (req.getKind() == PaymentKind.REFUND && req.getAmount() > 0) {
            throw new IllegalArgumentException("환불정정은 음수 금액이어야 합니다");
        }
        if (req.getKind() != PaymentKind.REFUND && req.getAmount() < 0) {
            throw new IllegalArgumentException("일반 납부는 양수 금액이어야 합니다");
        }

        // 과납 방어: 남은 미수금을 1원이라도 초과하면 거부한다.
        // REFUND(음수) 정정은 합계를 줄이므로 이 검증에서 제외한다.
        // mm.price 파싱 실패(총액 불명)인 경우에는 비교할 수 없으므로 스킵.
        if (req.getKind() != PaymentKind.REFUND) {
            Long total = PriceUtils.parse(mm.getPrice());
            if (total != null) {
                long alreadyPaid = paymentRepository.sumAmountByMemberMembershipSeq(mm.getSeq());
                long remaining = Math.max(0L, total - alreadyPaid);
                if (alreadyPaid + req.getAmount() > total) {
                    throw new IllegalArgumentException(
                            String.format("남은 미수금(%,d원)보다 큰 금액은 납부할 수 없습니다.", remaining));
                }
            }
        }

        MembershipPayment payment = MembershipPayment.builder()
                .memberMembership(mm)
                .amount(req.getAmount())
                .paidDate(req.getPaidDate() != null ? req.getPaidDate() : LocalDateTime.now())
                .method(req.getMethod())
                .kind(req.getKind())
                .note(req.getNote())
                .build();
        paymentRepository.save(payment);

        ActivityEventType eventType = req.getKind() == PaymentKind.REFUND
                ? ActivityEventType.PAYMENT_REFUND : ActivityEventType.PAYMENT_ADD;
        String note = String.format("%s %,d원 (%s)",
                req.getKind().getLabel(), req.getAmount(), mm.getMembership().getName());
        eventPublisher.publishEvent(ActivityEvent.ofMembership(
                mm.getMember(), eventType, mm.getSeq(), note));

        return MembershipPaymentResponse.from(payment);
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

    /**
     * 회원 목록에 최근 출석 기록을 매핑한다.
     */
    public void populateAttendanceHistory(List<ComplexMemberResponse> members) {
        if (members.isEmpty()) return;
        List<Long> memberSeqs = members.stream().map(ComplexMemberResponse::getSeq).toList();
        List<Map<String, Object>> historyRows = complexMemberQueryMapper.selectAttendanceHistory(memberSeqs);
        Map<Long, List<String>> historyMap = new HashMap<>();
        for (Map<String, Object> row : historyRows) {
            Long memberSeq = ((Number) row.get("memberSeq")).longValue();
            String status = (String) row.get("status");
            historyMap.computeIfAbsent(memberSeq, k -> new ArrayList<>()).add(status);
        }
        for (ComplexMemberResponse m : members) {
            m.setAttendanceHistory(historyMap.getOrDefault(m.getSeq(), List.of()));
        }
    }

    private ComplexMemberMembership findOwnedMembership(Long memberSeq, Long mmSeq) {
        ComplexMemberMembership mm = memberMembershipRepository.findById(mmSeq)
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));
        if (mm.getMember() == null || !mm.getMember().getSeq().equals(memberSeq)) {
            throw new EntityNotFoundException("멤버십");
        }
        return mm;
    }

}
