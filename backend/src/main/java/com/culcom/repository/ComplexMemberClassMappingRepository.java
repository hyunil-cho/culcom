package com.culcom.repository;

import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ComplexMemberClassMappingRepository extends JpaRepository<ComplexMemberClassMapping, Long> {

    @Query("SELECT m FROM ComplexMemberClassMapping m " +
           "JOIN FETCH m.complexClass " +
           "WHERE m.member.seq = :memberSeq " +
           "ORDER BY m.sortOrder, m.seq")
    List<ComplexMemberClassMapping> findByMemberSeq(@Param("memberSeq") Long memberSeq);

    void deleteByMemberSeq(Long memberSeq);

    @Query("SELECT m FROM ComplexMemberClassMapping m " +
           "JOIN FETCH m.member " +
           "WHERE m.complexClass.seq = :classSeq " +
           "ORDER BY m.sortOrder, m.seq")
    List<ComplexMemberClassMapping> findByComplexClassSeqWithMember(@Param("classSeq") Long classSeq);

    boolean existsByComplexClassSeqAndMemberSeq(Long classSeq, Long memberSeq);

    void deleteByComplexClassSeqAndMemberSeq(Long classSeq, Long memberSeq);

    List<ComplexMemberClassMapping> findByComplexClassSeqAndMemberSeqIn(Long classSeq, List<Long> memberSeqs);

    @Query("SELECT m FROM ComplexMemberClassMapping m " +
           "JOIN FETCH m.member " +
           "JOIN FETCH m.complexClass c " +
           "JOIN FETCH c.timeSlot " +
           "WHERE c.branch.seq = :branchSeq " +
           "ORDER BY c.timeSlot.seq, c.sortOrder, m.seq")
    List<ComplexMemberClassMapping> findAllWithMemberByBranch(@Param("branchSeq") Long branchSeq);

    @Query("SELECT m FROM ComplexMemberClassMapping m " +
           "JOIN FETCH m.member " +
           "JOIN FETCH m.complexClass c " +
           "WHERE c.timeSlot.seq = :timeSlotSeq AND c.branch.seq = :branchSeq " +
           "ORDER BY c.sortOrder, m.seq")
    List<ComplexMemberClassMapping> findByTimeSlotAndBranch(
            @Param("branchSeq") Long branchSeq, @Param("timeSlotSeq") Long timeSlotSeq);
}
