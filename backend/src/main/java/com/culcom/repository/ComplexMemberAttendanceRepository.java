package com.culcom.repository;

import com.culcom.entity.complex.member.ComplexMemberAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface ComplexMemberAttendanceRepository extends JpaRepository<ComplexMemberAttendance, Long> {

    @Query("SELECT a FROM ComplexMemberAttendance a " +
           "JOIN FETCH a.member m " +
           "WHERE a.complexClass.seq = :classSeq AND a.attendanceDate = :date")
    List<ComplexMemberAttendance> findByClassAndDate(@Param("classSeq") Long classSeq, @Param("date") LocalDate date);

    List<ComplexMemberAttendance> findByMemberSeq(Long memberSeq);

    List<ComplexMemberAttendance> findByMemberMembershipSeq(Long memberMembershipSeq);

    @Query("SELECT a FROM ComplexMemberAttendance a " +
           "JOIN FETCH a.member m " +
           "WHERE a.complexClass.seq IN :classSeqs AND a.attendanceDate = :date")
    List<ComplexMemberAttendance> findByClassSeqsAndDate(
            @Param("classSeqs") List<Long> classSeqs, @Param("date") LocalDate date);

    @Query("SELECT a FROM ComplexMemberAttendance a " +
           "JOIN FETCH a.member m " +
           "WHERE a.complexClass.seq IN :classSeqs " +
           "ORDER BY a.complexClass.seq, a.member.seq, a.attendanceDate DESC")
    List<ComplexMemberAttendance> findRecentByClassSeqs(@Param("classSeqs") List<Long> classSeqs);

    @Query("SELECT a FROM ComplexMemberAttendance a " +
           "WHERE a.member.seq = :memberSeq " +
           "AND a.complexClass.seq = :classSeq " +
           "AND a.attendanceDate = :date")
    java.util.Optional<ComplexMemberAttendance> findByMemberAndClassAndDate(
            @Param("memberSeq") Long memberSeq,
            @Param("classSeq") Long classSeq,
            @Param("date") LocalDate date);
}
