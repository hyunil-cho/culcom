package com.culcom.repository;

import com.culcom.entity.complex.member.ComplexMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ComplexMemberRepository extends JpaRepository<ComplexMember, Long> {
    @Query("SELECT m FROM ComplexMember m WHERE m.branch.seq = :branchSeq AND m.staffInfo IS NULL")
    Page<ComplexMember> findByBranchSeq(@Param("branchSeq") Long branchSeq, Pageable pageable);

    @Query("SELECT m FROM ComplexMember m WHERE m.branch.seq = :branchSeq AND m.staffInfo IS NULL AND (m.name LIKE %:keyword% OR m.phoneNumber LIKE %:keyword%)")
    Page<ComplexMember> searchByBranchSeq(@Param("branchSeq") Long branchSeq, @Param("keyword") String keyword, Pageable pageable);

    List<ComplexMember> findByNameAndPhoneNumber(String name, String phoneNumber);

    @Query("SELECT m FROM ComplexMember m JOIN m.staffInfo si WHERE m.branch.seq = :branchSeq")
    List<ComplexMember> findStaffByBranchSeq(@Param("branchSeq") Long branchSeq);
}
