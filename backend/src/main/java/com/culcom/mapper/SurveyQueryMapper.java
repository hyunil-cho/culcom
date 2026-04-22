package com.culcom.mapper;

import com.culcom.dto.complex.survey.SurveySubmissionRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SurveyQueryMapper {

    List<SurveySubmissionRow> selectSubmissions(@Param("branchSeq") Long branchSeq,
                                                 @Param("offset") int offset,
                                                 @Param("size") int size);

    int countSubmissions(@Param("branchSeq") Long branchSeq);
}
