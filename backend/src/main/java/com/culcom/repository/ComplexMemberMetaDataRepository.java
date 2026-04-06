package com.culcom.repository;

import com.culcom.entity.complex.member.ComplexMemberMetaData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ComplexMemberMetaDataRepository extends JpaRepository<ComplexMemberMetaData, Long> {
    Optional<ComplexMemberMetaData> findByMemberSeq(Long memberSeq);
}
