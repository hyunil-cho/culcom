package com.culcom.mapper;

import com.culcom.dto.complex.dashboard.TrendItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ComplexDashboardMapper {

    List<TrendItem> selectMembers(
            @Param("branchSeq") Long branchSeq,
            @Param("period") String period,
            @Param("count") int count);

    List<TrendItem> selectStaffs(
            @Param("branchSeq") Long branchSeq,
            @Param("period") String period,
            @Param("count") int count);

    List<TrendItem> selectPostponements(
            @Param("branchSeq") Long branchSeq,
            @Param("period") String period,
            @Param("count") int count);

    List<TrendItem> selectRefunds(
            @Param("branchSeq") Long branchSeq,
            @Param("period") String period,
            @Param("count") int count);

    List<TrendItem> selectTransfers(
            @Param("branchSeq") Long branchSeq,
            @Param("period") String period,
            @Param("count") int count);

    List<TrendItem> selectPostponementReturns(
            @Param("branchSeq") Long branchSeq,
            @Param("period") String period,
            @Param("count") int count);
}