package com.culcom.mapper;

import com.culcom.dto.dashboard.CallerStatsResponse;
import com.culcom.dto.dashboard.DailyStatsResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface DashboardMapper {

    int countTodayCustomers(@Param("branchSeq") Long branchSeq);

    List<DailyStatsResponse> selectDailyStats(
            @Param("branchSeq") Long branchSeq,
            @Param("days") int days);

    int selectSmsRemaining(@Param("branchSeq") Long branchSeq);

    int selectLmsRemaining(@Param("branchSeq") Long branchSeq);

    List<CallerStatsResponse> selectCallerStats(
            @Param("branchSeq") Long branchSeq,
            @Param("period") String period);
}