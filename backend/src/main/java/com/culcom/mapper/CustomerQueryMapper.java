package com.culcom.mapper;

import com.culcom.dto.customer.CustomerResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CustomerQueryMapper {

    List<CustomerResponse> search(
            @Param("branchSeq") Long branchSeq,
            @Param("filter") String filter,
            @Param("searchType") String searchType,
            @Param("keyword") String keyword,
            @Param("offset") int offset,
            @Param("size") int size);

    int count(
            @Param("branchSeq") Long branchSeq,
            @Param("filter") String filter,
            @Param("searchType") String searchType,
            @Param("keyword") String keyword);
}
