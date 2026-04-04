package com.culcom.repository;

import com.culcom.entity.complex.staff.ComplexStaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ComplexStaffAttendanceRepository extends JpaRepository<ComplexStaffAttendance, Long> {

    @Query("SELECT a FROM ComplexStaffAttendance a " +
           "JOIN FETCH a.staff " +
           "WHERE a.complexClass.seq IN :classSeqs AND a.attendanceDate = :date")
    List<ComplexStaffAttendance> findByClassSeqsAndDate(
            @Param("classSeqs") List<Long> classSeqs, @Param("date") LocalDate date);

    Optional<ComplexStaffAttendance> findByStaffSeqAndComplexClassSeqAndAttendanceDate(
            Long staffSeq, Long classSeq, LocalDate attendanceDate);
}
