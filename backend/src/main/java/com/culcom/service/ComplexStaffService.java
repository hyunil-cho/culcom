package com.culcom.service;

import com.culcom.dto.complex.member.ComplexStaffRefundInfoRequest;
import com.culcom.dto.complex.member.ComplexStaffRefundInfoResponse;
import com.culcom.dto.complex.member.ComplexStaffRequest;
import com.culcom.dto.complex.member.ComplexStaffResponse;
import com.culcom.entity.complex.staff.ComplexStaff;
import com.culcom.entity.complex.staff.ComplexStaffRefundInfo;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexStaffRefundInfoRepository;
import com.culcom.repository.ComplexStaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ComplexStaffService {

    private final ComplexStaffRepository staffRepository;
    private final ComplexStaffRefundInfoRepository refundInfoRepository;
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
                .joinDate(req.getJoinDate())
                .comment(req.getComment())
                .interviewer(req.getInterviewer())
                .paymentMethod(req.getPaymentMethod())
                .branch(branchRepository.getReferenceById(branchSeq))
                .build();
        return ComplexStaffResponse.from(staffRepository.save(staff));
    }

    public ComplexStaffResponse update(Long seq, ComplexStaffRequest req) {
        ComplexStaff staff = staffRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("스태프"));
        staff.setName(req.getName());
        staff.setPhoneNumber(req.getPhoneNumber());
        staff.setEmail(req.getEmail());
        staff.setSubject(req.getSubject());
        staff.setStatus(req.getStatus());
        staff.setJoinDate(req.getJoinDate());
        staff.setComment(req.getComment());
        staff.setInterviewer(req.getInterviewer());
        staff.setPaymentMethod(req.getPaymentMethod());
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
        refund.setLastUpdateDate(LocalDateTime.now());

        return ComplexStaffRefundInfoResponse.from(refundInfoRepository.save(refund));
    }

    @Transactional
    public void deleteRefundInfo(Long staffSeq) {
        refundInfoRepository.deleteByStaffSeq(staffSeq);
    }
}
