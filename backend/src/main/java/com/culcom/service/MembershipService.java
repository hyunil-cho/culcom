package com.culcom.service;

import com.culcom.dto.complex.member.MembershipRequest;
import com.culcom.dto.complex.member.MembershipResponse;
import com.culcom.entity.product.Membership;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.MembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MembershipService {

    private final MembershipRepository membershipRepository;

    public List<MembershipResponse> list() {
        return membershipRepository.findByIsInternalFalseAndDeletedFalse()
                .stream().map(MembershipResponse::from).toList();
    }

    public MembershipResponse get(Long seq) {
        Membership m = membershipRepository.findBySeqAndDeletedFalse(seq)
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));
        return MembershipResponse.from(m);
    }

    @Transactional
    public MembershipResponse create(MembershipRequest req) {
        Membership membership = Membership.builder()
                .name(req.getName())
                .duration(req.getDuration())
                .count(req.getCount())
                .price(req.getPrice())
                .transferable(req.getTransferable())
                .build();
        return MembershipResponse.from(membershipRepository.save(membership));
    }

    @Transactional
    public MembershipResponse update(Long seq, MembershipRequest req) {
        Membership m = membershipRepository.findBySeqAndDeletedFalse(seq)
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));
        m.setName(req.getName());
        m.setDuration(req.getDuration());
        m.setCount(req.getCount());
        m.setPrice(req.getPrice());
        m.setTransferable(req.getTransferable());
        return MembershipResponse.from(membershipRepository.save(m));
    }

    @Transactional
    public void delete(Long seq) {
        Membership m = membershipRepository.findBySeqAndDeletedFalse(seq)
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));
        m.setDeleted(true);
        membershipRepository.save(m);
    }
}
