package com.culcom.service;

import com.culcom.dto.complex.member.ComplexMemberMetaDataRequest;
import com.culcom.dto.complex.member.ComplexMemberRequest;
import com.culcom.dto.complex.member.ComplexMemberResponse;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMetaData;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.mapper.ComplexMemberQueryMapper;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.MembershipPaymentRepository;
import com.culcom.repository.SurveySubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ComplexMemberService {

    private final ComplexMemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final ComplexMemberQueryMapper complexMemberQueryMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final SmsService smsService;
    private final MembershipPaymentRepository membershipPaymentRepository;
    private final SurveySubmissionRepository surveySubmissionRepository;

    public ComplexMemberResponse get(Long seq) {
        ComplexMember member = memberRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        return ComplexMemberResponse.from(member);
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

        // 설문 제출에서 "불러오기"로 생성된 회원이라면, 해당 제출을 참조 완료로 표시한다.
        if (req.getSurveySubmissionSeq() != null) {
            surveySubmissionRepository.findById(req.getSurveySubmissionSeq()).ifPresent(sub -> {
                sub.setReferenced(true);
                surveySubmissionRepository.save(sub);
            });
        }

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
        metaData.setInterviewer(req.getInterviewer());
        return ComplexMemberResponse.from(memberRepository.save(member));
    }

    @Transactional
    public void delete(Long seq) {
        memberRepository.deleteById(seq);
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

    /**
     * 회원 목록에 첫 납부(DEPOSIT) 금액과 일자를 매핑한다.
     */
    public void populateFirstPayment(List<ComplexMemberResponse> members) {
        if (members.isEmpty()) return;
        List<Long> memberSeqs = members.stream().map(ComplexMemberResponse::getSeq).toList();
        List<MembershipPayment> deposits = membershipPaymentRepository.findDepositsByMemberSeqs(memberSeqs);
        Map<Long, MembershipPayment> firstByMember = new HashMap<>();
        for (MembershipPayment p : deposits) {
            Long memberSeq = p.getMemberMembership().getMember().getSeq();
            firstByMember.putIfAbsent(memberSeq, p);
        }
        for (ComplexMemberResponse m : members) {
            MembershipPayment p = firstByMember.get(m.getSeq());
            if (p != null) {
                m.setFirstPaymentAmount(p.getAmount());
                m.setFirstPaymentDate(p.getPaidDate());
            }
        }
    }
}
