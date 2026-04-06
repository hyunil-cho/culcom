package com.culcom.service;

import com.culcom.dto.complex.member.ComplexStaffRefundInfoRequest;
import com.culcom.dto.complex.member.ComplexStaffRefundInfoResponse;
import com.culcom.dto.complex.member.ComplexStaffRequest;
import com.culcom.dto.complex.member.ComplexStaffResponse;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.staff.ComplexStaff;
import com.culcom.entity.complex.staff.ComplexStaffClassLog;
import com.culcom.entity.complex.staff.ComplexStaffRefundInfo;
import com.culcom.entity.complex.staff.ComplexStaffStatusLog;
import com.culcom.entity.enums.StaffStatus;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexStaffClassLogRepository;
import com.culcom.repository.ComplexStaffRefundInfoRepository;
import com.culcom.repository.ComplexStaffRepository;
import com.culcom.repository.ComplexStaffStatusLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ComplexStaffService {

    private final ComplexStaffRepository staffRepository;
    private final ComplexStaffRefundInfoRepository refundInfoRepository;
    private final ComplexStaffStatusLogRepository statusLogRepository;
    private final ComplexStaffClassLogRepository staffClassLogRepository;
    private final ComplexClassRepository classRepository;
    private final BranchRepository branchRepository;

    public List<ComplexStaffResponse> list(Long branchSeq) {
        return staffRepository.findByBranchSeq(branchSeq)
                .stream().map(ComplexStaffResponse::from).toList();
    }

    public ComplexStaffResponse get(Long seq) {
        ComplexStaff staff = staffRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("스태프"));
        return ComplexStaffResponse.from(staff);
    }

    public ComplexStaffResponse create(ComplexStaffRequest req, Long branchSeq) {
        ComplexStaff staff = ComplexStaff.builder()
                .name(req.getName())
                .phoneNumber(req.getPhoneNumber())
                .email(req.getEmail())
                .subject(req.getSubject())
                .status(req.getStatus())
                .joinDate(req.getJoinDate() != null ? req.getJoinDate() : LocalDate.now())
                .comment(req.getComment())
                .interviewer(req.getInterviewer())
                .paymentMethod(req.getPaymentMethod())
                .branch(branchRepository.getReferenceById(branchSeq))
                .build();
        return ComplexStaffResponse.from(staffRepository.save(staff));
    }

    @Transactional
    public ComplexStaffResponse update(Long seq, ComplexStaffRequest req) {
        ComplexStaff staff = staffRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("스태프"));

        StaffStatus oldStatus = staff.getStatus();
        StaffStatus newStatus = req.getStatus();
        if (oldStatus != newStatus) {
            statusLogRepository.save(ComplexStaffStatusLog.builder()
                    .staff(staff)
                    .fromStatus(oldStatus)
                    .toStatus(newStatus)
                    .build());
        }

        staff.setName(req.getName());
        staff.setPhoneNumber(req.getPhoneNumber());
        staff.setEmail(req.getEmail());
        staff.setSubject(req.getSubject());
        staff.setStatus(newStatus);
        staff.setJoinDate(req.getJoinDate());
        staff.setComment(req.getComment());
        staff.setInterviewer(req.getInterviewer());
        staff.setPaymentMethod(req.getPaymentMethod());

        // 휴직/퇴직 시 배정된 수업에서 제외
        if (oldStatus == StaffStatus.재직 && newStatus != StaffStatus.재직) {
            List<ComplexClass> assignedClasses = classRepository.findByStaffSeq(seq);
            for (ComplexClass cls : assignedClasses) {
                cls.setStaff(null);
                classRepository.save(cls);
                staffClassLogRepository.save(ComplexStaffClassLog.builder()
                        .staff(staff).complexClass(cls).action("UNASSIGN").build());
            }
        }

        return ComplexStaffResponse.from(staffRepository.save(staff));
    }

    @Transactional
    public void delete(Long seq) {
        refundInfoRepository.deleteByStaffSeq(seq);
        staffRepository.deleteById(seq);
    }

    public ComplexStaffRefundInfoResponse getRefundInfo(Long staffSeq) {
        return refundInfoRepository.findByStaffSeq(staffSeq)
                .map(ComplexStaffRefundInfoResponse::from)
                .orElse(null);
    }

    public ComplexStaffRefundInfoResponse saveRefundInfo(Long staffSeq, ComplexStaffRefundInfoRequest req) {
        ComplexStaff staff = staffRepository.findById(staffSeq)
                .orElseThrow(() -> new EntityNotFoundException("스태프"));

        ComplexStaffRefundInfo refund = refundInfoRepository.findByStaffSeq(staffSeq)
                .orElse(ComplexStaffRefundInfo.builder().staff(staff).build());

        refund.setDepositAmount(req.getDepositAmount());
        refund.setRefundableDeposit(req.getRefundableDeposit());
        refund.setNonRefundableDeposit(req.getNonRefundableDeposit());
        refund.setRefundBank(req.getRefundBank());
        refund.setRefundAccount(req.getRefundAccount());
        refund.setRefundAmount(req.getRefundAmount());

        return ComplexStaffRefundInfoResponse.from(refundInfoRepository.save(refund));
    }

    @Transactional
    public void deleteRefundInfo(Long staffSeq) {
        refundInfoRepository.deleteByStaffSeq(staffSeq);
    }
}
