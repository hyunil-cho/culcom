package com.culcom.mapper;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 회원 목록 조회 시 '특이사항(comment)' 값이 응답에 포함되지 않는지 검증한다.
 * 목록은 테이블에 표시되지 않는 comment 까지 내려줄 필요가 없어 응답 경량화를 위해 제외함.
 * (상세 조회는 여전히 comment 를 포함하므로 이 검증은 목록 쿼리에 한정한다.)
 *
 * XML 리소스 원본을 읽어 SELECT 절에 comment 가 선언되지 않았음을 확인한다.
 * Spring 컨텍스트 로딩 없이 빠르게 실행되며, 실수로 comment 가 다시 추가되는 회귀를 차단한다.
 */
class ComplexMemberListCommentOmittedTest {

    private static final Path MAPPER_XML =
            Paths.get("src", "main", "resources", "mapper", "ComplexMemberQueryMapper.xml");

    private String readMapper() throws IOException {
        return Files.readString(MAPPER_XML, StandardCharsets.UTF_8);
    }

    private String extractSearchSelect(String xml) {
        int start = xml.indexOf("<select id=\"search\"");
        int end = xml.indexOf("</select>", start);
        assertThat(start).as("search select 를 찾을 수 없다").isGreaterThanOrEqualTo(0);
        assertThat(end).as("search select 종료 태그를 찾을 수 없다").isGreaterThan(start);
        return xml.substring(start, end);
    }

    @Test
    @DisplayName("목록 쿼리 SELECT 절에 m.comment 가 없다")
    void 목록_쿼리에_comment_미포함() throws IOException {
        String searchSelect = extractSearchSelect(readMapper());

        assertThat(searchSelect)
                .as("목록 응답 경량화를 위해 comment 는 SELECT 하지 말아야 한다")
                .doesNotContain("m.comment")
                .doesNotContainIgnoringCase(" comment ")
                .doesNotContainIgnoringCase(",comment")
                .doesNotContainIgnoringCase("comment,")
                .doesNotContainIgnoringCase("AS comment");
    }

    @Test
    @DisplayName("다른 필드는 SELECT 에 남아 있다 (회귀 방지)")
    void 다른_필드는_유지된다() throws IOException {
        String searchSelect = extractSearchSelect(readMapper());

        assertThat(searchSelect).contains("m.name");
        assertThat(searchSelect).contains("m.phone_number");
        assertThat(searchSelect).contains("m.info");
        assertThat(searchSelect).contains("m.join_date");
        assertThat(searchSelect).contains("m.created_date");
    }
}
