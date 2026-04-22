package com.culcom.mapper;

import com.culcom.dto.complex.attendance.AttendanceHistoryRow;
import com.culcom.dto.complex.attendance.AttendanceViewRow;
import com.culcom.dto.complex.attendance.StaffAttendanceRateSummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface AttendanceViewQueryMapper {

    /** 등록현황 통합 뷰 (시간대별 > 수업별 > 회원/스태프) */
    List<AttendanceViewRow> selectAttendanceView(
            @Param("branchSeq") Long branchSeq,
            @Param("today") LocalDate today,
            @Param("sevenDaysAgo") LocalDate sevenDaysAgo);

    /** 등록현황 상세 뷰 (특정 시간대) */
    List<AttendanceViewRow> selectAttendanceDetail(
            @Param("branchSeq") Long branchSeq,
            @Param("slotSeq") Long slotSeq,
            @Param("today") LocalDate today);

    /** 상세 뷰의 최근 출석기록 (최대 10건씩) */
    List<AttendanceHistoryRow> selectRecentHistory(
            @Param("branchSeq") Long branchSeq,
            @Param("slotSeq") Long slotSeq);

    /** 전체 스태프 출석율 요약 (최근 3개월) */
    List<StaffAttendanceRateSummary> selectAllStaffAttendanceRates(
            @Param("branchSeq") Long branchSeq,
            @Param("fromDate") LocalDate fromDate);
}
