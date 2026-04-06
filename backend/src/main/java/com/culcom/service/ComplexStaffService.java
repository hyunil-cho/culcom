package com.culcom.service;

import com.culcom.dto.complex.member.ComplexStaffRefundInfoRequest;
import com.culcom.dto.complex.member.ComplexStaffRefundInfoResponse;
import com.culcom.dto.complex.member.ComplexStaffRequest;
import com.culcom.dto.complex.member.ComplexStaffResponse;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexStaffInfo;
import com.culcom.entity.complex.staff.ComplexStaffChangeLog;
import com.culcom.entity.complex.staff.ComplexStaffClassLog;
import com.culcom.entity.complex.staff.ComplexStaffStatusLog;
import com.culcom.entity.enums.StaffStatus;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ComplexStaffService {

    private final ComplexMemberRepository memberRepository;
    private final ComplexStaffInfoRepository staffInfoRepository;
    private final ComplexStaffStatusLogRepository statusLogRepository;
    private final ComplexStaffClassLogRepository staffClassLogRepository;
    private final ComplexStaffChangeLogRepository changeLogRepository;
    private final ComplexClassRepository classRepository;
    private final BranchRepository branchRepository;

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
        if (staffInfo == null) throw new EntityNotFoundException("스태프 정보");

        StaffStatus oldStatus = staffInfo.getStatus();
        StaffStatus newStatus = req.getStatus() != null ? req.getStatus() : oldStatus;
        if (oldStatus != newStatus) {
            statusLogRepository.save(ComplexStaffStatusLog.builder()
                    .member(member).fromStatus(oldStatus).toStatus(newStatus).build());
        }

        logIfChanged(member, "이름", member.getName(), req.getName());
        logIfChanged(member, "전화번호", member.getPhoneNumber(), req.getPhoneNumber());
        logIfChanged(member, "면접관", member.getInterviewer(), req.getInterviewer());

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
                staffClassLogRepository.save(ComplexStaffClassLog.builder()
                        .member(member).complexClass(cls).action("UNASSIGN").build());
            }
        }

        return ComplexStaffResponse.from(memberRepository.save(member));
    }

    private void logIfChanged(ComplexMember member, String fieldName, String oldVal, String newVal) {
        if (!Objects.equals(oldVal, newVal)) {
            changeLogRepository.save(ComplexStaffChangeLog.builder()
                    .member(member).changeType("INFO_CHANGE")
                    .fieldName(fieldName).oldValue(oldVal).newValue(newVal).build());
        }
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

        logRefundIfChanged(member, "입금액", staffInfo.getDepositAmount(), req.getDepositAmount());
        logRefundIfChanged(member, "환불가능금액", staffInfo.getRefundableDeposit(), req.getRefundableDeposit());
        logRefundIfChanged(member, "환불불가금액", staffInfo.getNonRefundableDeposit(), req.getNonRefundableDeposit());
        logRefundIfChanged(member, "환불은행", staffInfo.getRefundBank(), req.getRefundBank());
        logRefundIfChanged(member, "환불계좌", staffInfo.getRefundAccount(), req.getRefundAccount());
        logRefundIfChanged(member, "환불금액", staffInfo.getRefundAmount(), req.getRefundAmount());
        logRefundIfChanged(member, "결제방식", staffInfo.getPaymentMethod(), req.getPaymentMethod());

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
        changeLogRepository.save(ComplexStaffChangeLog.builder()
                .member(member).changeType("REFUND_CHANGE").fieldName("환불정보")
                .oldValue("삭제").newValue(null).build());

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

    private void logRefundIfChanged(ComplexMember member, String fieldName, String oldVal, String newVal) {
        if (!Objects.equals(oldVal, newVal)) {
            changeLogRepository.save(ComplexStaffChangeLog.builder()
                    .member(member).changeType("REFUND_CHANGE")
                    .fieldName(fieldName).oldValue(oldVal).newValue(newVal).build());
        }
    }
}
