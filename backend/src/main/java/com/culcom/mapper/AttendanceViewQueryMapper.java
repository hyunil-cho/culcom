package com.culcom.mapper;

import com.culcom.dto.complex.attendance.AttendanceHistoryDetailRow;
import com.culcom.dto.complex.attendance.AttendanceHistoryRow;
import com.culcom.dto.complex.attendance.AttendanceViewRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface AttendanceViewQueryMapper {

    /** 등록현황 통합 뷰 (시간대별 > 수업별 > 회원/스태프) */
    List<AttendanceViewRow> selectAttendanceView(
            @Param("branchSeq") Long branchSeq,
            @Param("today") LocalDate today);

    /** 등록현황 상세 뷰 (특정 시간대) */
    List<AttendanceViewRow> selectAttendanceDetail(
            @Param("branchSeq") Long branchSeq,
            @Param("slotSeq") Long slotSeq);

    /** 상세 뷰의 최근 출석기록 (최대 10건씩) */
    List<AttendanceHistoryRow> selectRecentHistory(
            @Param("branchSeq") Long branchSeq,
            @Param("slotSeq") Long slotSeq);

    /** 회원 개인별 출석 히스토리 (페이징) */
    List<AttendanceHistoryDetailRow> selectMemberAttendanceHistory(
            @Param("branchSeq") Long branchSeq,
            @Param("memberSeq") Long memberSeq,
            @Param("offset") int offset,
            @Param("size") int size);

    /** 회원 개인별 출석 히스토리 총 건수 */
    int countMemberAttendanceHistory(
            @Param("branchSeq") Long branchSeq,
            @Param("memberSeq") Long memberSeq);

    /** 스태프 개인별 출석 히스토리 (페이징) */
    List<AttendanceHistoryDetailRow> selectStaffAttendanceHistory(
            @Param("branchSeq") Long branchSeq,
            @Param("staffSeq") Long staffSeq,
            @Param("offset") int offset,
            @Param("size") int size);

    /** 스태프 개인별 출석 히스토리 총 건수 */
    int countStaffAttendanceHistory(
            @Param("branchSeq") Long branchSeq,
            @Param("staffSeq") Long staffSeq);
}
