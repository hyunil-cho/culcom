package com.culcom.service;

import com.culcom.dto.complex.member.ComplexStaffRefundInfoRequest;
import com.culcom.dto.complex.member.ComplexStaffRefundInfoResponse;
import com.culcom.dto.complex.member.ComplexStaffRequest;
import com.culcom.dto.complex.member.ComplexStaffResponse;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.staff.ComplexStaff;
import com.culcom.entity.complex.staff.ComplexStaffChangeLog;
import com.culcom.entity.complex.staff.ComplexStaffClassLog;
import com.culcom.entity.complex.staff.ComplexStaffRefundInfo;
import com.culcom.entity.complex.staff.ComplexStaffStatusLog;
import com.culcom.entity.enums.StaffStatus;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexStaffChangeLogRepository;
import com.culcom.repository.ComplexStaffClassLogRepository;
import com.culcom.repository.ComplexStaffRefundInfoRepository;
import com.culcom.repository.ComplexStaffRepository;
import com.culcom.repository.ComplexStaffStatusLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ComplexStaffService {

    private final ComplexStaffRepository staffRepository;
    private final ComplexStaffRefundInfoRepository refundInfoRepository;
    private final ComplexStaffStatusLogRepository statusLogRepository;
    private final ComplexStaffClassLogRepository staffClassLogRepository;
    private final ComplexStaffChangeLogRepository changeLogRepository;
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
                .bio(req.getBio())
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

        // 필드 변경 감지 및 로그 기록
        logIfChanged(staff, "이름", staff.getName(), req.getName());
        logIfChanged(staff, "전화번호", staff.getPhoneNumber(), req.getPhoneNumber());
        logIfChanged(staff, "이메일", staff.getEmail(), req.getEmail());
        logIfChanged(staff, "담당과목", staff.getSubject(), req.getSubject());
        logIfChanged(staff, "면접관", staff.getInterviewer(), req.getInterviewer());
        logIfChanged(staff, "결제방식", staff.getPaymentMethod(), req.getPaymentMethod());
        logIfChanged(staff, "비고", staff.getComment(), req.getComment());
        logIfChanged(staff, "인적사항", staff.getBio(), req.getBio());
        logIfChanged(staff, "입사일",
                staff.getJoinDate() != null ? staff.getJoinDate().toString() : null,
                req.getJoinDate() != null ? req.getJoinDate().toString() : null);

        staff.setName(req.getName());
        staff.setPhoneNumber(req.getPhoneNumber());
        staff.setEmail(req.getEmail());
        staff.setSubject(req.getSubject());
        staff.setStatus(newStatus);
        staff.setJoinDate(req.getJoinDate());
        staff.setComment(req.getComment());
        staff.setInterviewer(req.getInterviewer());
        staff.setPaymentMethod(req.getPaymentMethod());
        staff.setBio(req.getBio());

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

    private void logIfChanged(ComplexStaff staff, String fieldName, String oldVal, String newVal) {
        if (!Objects.equals(oldVal, newVal)) {
            changeLogRepository.save(ComplexStaffChangeLog.builder()
                    .staff(staff)
                    .changeType("INFO_CHANGE")
                    .fieldName(fieldName)
                    .oldValue(oldVal)
                    .newValue(newVal)
                    .build());
        }
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

    @Transactional
    public ComplexStaffRefundInfoResponse saveRefundInfo(Long staffSeq, ComplexStaffRefundInfoRequest req) {
        ComplexStaff staff = staffRepository.findById(staffSeq)
                .orElseThrow(() -> new EntityNotFoundException("스태프"));

        ComplexStaffRefundInfo refund = refundInfoRepository.findByStaffSeq(staffSeq)
                .orElse(null);

        boolean isNew = (refund == null);
        if (isNew) {
            refund = ComplexStaffRefundInfo.builder().staff(staff).build();
        }

        if (isNew) {
            changeLogRepository.save(ComplexStaffChangeLog.builder()
                    .staff(staff).changeType("REFUND_CHANGE").fieldName("환불정보")
                    .oldValue(null).newValue("등록").build());
        } else {
            logRefundIfChanged(staff, "입금액", refund.getDepositAmount(), req.getDepositAmount());
            logRefundIfChanged(staff, "환불가능금액", refund.getRefundableDeposit(), req.getRefundableDeposit());
            logRefundIfChanged(staff, "환불불가금액", refund.getNonRefundableDeposit(), req.getNonRefundableDeposit());
            logRefundIfChanged(staff, "환불은행", refund.getRefundBank(), req.getRefundBank());
            logRefundIfChanged(staff, "환불계좌", refund.getRefundAccount(), req.getRefundAccount());
            logRefundIfChanged(staff, "환불금액", refund.getRefundAmount(), req.getRefundAmount());
            logRefundIfChanged(staff, "결제방식", refund.getPaymentMethod(), req.getPaymentMethod());
        }

        refund.setDepositAmount(req.getDepositAmount());
        refund.setRefundableDeposit(req.getRefundableDeposit());
        refund.setNonRefundableDeposit(req.getNonRefundableDeposit());
        refund.setRefundBank(req.getRefundBank());
        refund.setRefundAccount(req.getRefundAccount());
        refund.setRefundAmount(req.getRefundAmount());
        refund.setPaymentMethod(req.getPaymentMethod());

        return ComplexStaffRefundInfoResponse.from(refundInfoRepository.save(refund));
    }

    @Transactional
    public void deleteRefundInfo(Long staffSeq) {
        ComplexStaff staff = staffRepository.findById(staffSeq)
                .orElseThrow(() -> new EntityNotFoundException("스태프"));
        changeLogRepository.save(ComplexStaffChangeLog.builder()
                .staff(staff).changeType("REFUND_CHANGE").fieldName("환불정보")
                .oldValue("삭제").newValue(null).build());
        refundInfoRepository.deleteByStaffSeq(staffSeq);
    }

    private void logRefundIfChanged(ComplexStaff staff, String fieldName, String oldVal, String newVal) {
        if (!Objects.equals(oldVal, newVal)) {
            changeLogRepository.save(ComplexStaffChangeLog.builder()
                    .staff(staff)
                    .changeType("REFUND_CHANGE")
                    .fieldName(fieldName)
                    .oldValue(oldVal)
                    .newValue(newVal)
                    .build());
        }
    }
}
