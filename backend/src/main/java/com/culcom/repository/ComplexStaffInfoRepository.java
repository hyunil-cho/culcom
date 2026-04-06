package com.culcom.repository;

import com.culcom.entity.complex.member.ComplexStaffInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ComplexStaffInfoRepository extends JpaRepository<ComplexStaffInfo, Long> {
    Optional<ComplexStaffInfo> findByMemberSeq(Long memberSeq);
    void deleteByMemberSeq(Long memberSeq);
}
