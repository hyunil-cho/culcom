package com.culcom.service;

import com.culcom.dto.complex.member.*;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.dto.complex.member.ComplexMemberMetaDataRequest;
import com.culcom.entity.complex.member.*;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ComplexMemberService {

    private final ComplexMemberRepository memberRepository;
    private final MembershipRepository membershipRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexClassRepository classRepository;
    private final ComplexMemberClassMappingRepository classMappingRepository;
    private final BranchRepository branchRepository;

    public ComplexMemberResponse get(Long seq) {
        ComplexMember member = memberRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        return ComplexMemberResponse.from(member);
    }

    public List<ComplexMemberMembershipResponse> getMemberships(Long memberSeq) {
        return memberMembershipRepository.findByMemberSeq(memberSeq)
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
        return ComplexMemberResponse.from(memberRepository.save(member));
    }

    @Transactional
    public ComplexMemberResponse update(Long seq, ComplexMemberRequest req) {
        ComplexMember member = memberRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
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
        ComplexMemberMembership mm = memberMembershipRepository.findById(mmSeq)
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));
        if (mm.getMember() == null || !mm.getMember().getSeq().equals(memberSeq)) {
            throw new EntityNotFoundException("멤버십");
        }

        if (req.getStartDate() != null && !req.getStartDate().isEmpty())
            mm.setStartDate(LocalDate.parse(req.getStartDate()));
        if (req.getExpiryDate() != null && !req.getExpiryDate().isEmpty())
            mm.setExpiryDate(LocalDate.parse(req.getExpiryDate()));
        if (req.getPrice() != null) mm.setPrice(req.getPrice());
        if (req.getDepositAmount() != null) mm.setDepositAmount(req.getDepositAmount());
        if (req.getPaymentMethod() != null) mm.setPaymentMethod(req.getPaymentMethod());
        if (req.getPaymentDate() != null && !req.getPaymentDate().isEmpty())
            mm.setPaymentDate(LocalDateTime.parse(req.getPaymentDate()));
        if (req.getStatus() != null && !req.getStatus().isEmpty()) {
            mm.setStatus(MembershipStatus.valueOf(req.getStatus()));
        }

        return ComplexMemberMembershipResponse.from(memberMembershipRepository.save(mm));
    }

    @Transactional
    public void deleteMembership(Long memberSeq, Long mmSeq) {
        ComplexMemberMembership mm = memberMembershipRepository.findById(mmSeq)
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));
        if (mm.getMember() == null || !mm.getMember().getSeq().equals(memberSeq)) {
            throw new EntityNotFoundException("멤버십");
        }
        memberMembershipRepository.delete(mm);
    }

    @Transactional
    public ComplexMemberMembershipResponse assignMembership(Long memberSeq, ComplexMemberMembershipRequest req) {
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        Membership membership = membershipRepository.findById(req.getMembershipSeq())
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));

        LocalDate startDate = req.getStartDate() != null && !req.getStartDate().isEmpty()
                ? LocalDate.parse(req.getStartDate()) : LocalDate.now();
        LocalDate expiryDate = req.getExpiryDate() != null && !req.getExpiryDate().isEmpty()
                ? LocalDate.parse(req.getExpiryDate()) : startDate.plusDays(membership.getDuration());
        LocalDateTime paymentDate = req.getPaymentDate() != null && !req.getPaymentDate().isEmpty()
                ? LocalDateTime.parse(req.getPaymentDate()) : null;
        MembershipStatus status = MembershipStatus.활성;
        if (req.getStatus() != null && !req.getStatus().isEmpty()) {
            status = MembershipStatus.valueOf(req.getStatus());
        }

        ComplexMemberMembership mm = ComplexMemberMembership.builder()
                .member(member)
                .membership(membership)
                .startDate(startDate)
                .expiryDate(expiryDate)
                .totalCount(membership.getCount())
                .price(req.getPrice())
                .depositAmount(req.getDepositAmount())
                .paymentMethod(req.getPaymentMethod())
                .paymentDate(paymentDate)
                .status(status)
                .build();

        if (member.getJoinDate() == null) {
            member.setJoinDate(startDate.atStartOfDay());
            memberRepository.save(member);
        }

        return ComplexMemberMembershipResponse.from(memberMembershipRepository.save(mm));
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
    }

    @Transactional
    public void reassignClass(Long memberSeq, Long classSeq) {
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        ComplexClass clazz = classRepository.findById(classSeq)
                .orElseThrow(() -> new EntityNotFoundException("수업"));

        classMappingRepository.deleteByMemberSeq(memberSeq);
        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(member)
                .complexClass(clazz)
                .build());
    }

    public List<ComplexMemberClassMapping> getClassMappings(Long memberSeq) {
        return classMappingRepository.findByMemberSeq(memberSeq);
    }
}
