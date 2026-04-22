package com.culcom.mapper;

import com.culcom.dto.complex.attendance.AttendanceHistoryRow;
import com.culcom.dto.complex.attendance.AttendanceViewRow;
import com.culcom.dto.complex.classes.ComplexClassResponse;
import com.culcom.dto.complex.member.ComplexMemberResponse;
import com.culcom.dto.complex.postponement.PostponementResponse;
import com.culcom.dto.complex.refund.RefundResponse;
import com.culcom.dto.customer.CustomerResponse;
import com.culcom.dto.notice.NoticeListResponse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * MyBatis Mapper XML의 SQL/컬럼 매핑이 실제 DB 스키마와 일치하는지 검증한다.
 * H2(test 프로필)에서 JPA가 생성한 스키마 위에 mapper 쿼리를 실행하여,
 * 컬럼명 오타나 스키마 불일치를 빌드 타임에 잡는다.
 * 다른 서비스 테스트와 동일 프로필을 쓰므로 Spring 컨텍스트가 공유되어 부팅 비용을 절약한다.
 */
@SpringBootTest
@ActiveProfiles("test")
class QueryMapperTest {

    @Autowired CustomerQueryMapper customerQueryMapper;
    @Autowired NoticeQueryMapper noticeQueryMapper;
    @Autowired PostponementQueryMapper postponementQueryMapper;
    @Autowired RefundQueryMapper refundQueryMapper;
    @Autowired ComplexMemberQueryMapper complexMemberQueryMapper;
    @Autowired ComplexClassQueryMapper complexClassQueryMapper;
    @Autowired AttendanceViewQueryMapper attendanceViewQueryMapper;

    // ── Customer ──

    @Test
    void customerSearch_noFilter() {
        List<CustomerResponse> result = customerQueryMapper.search(1L, "all", null, null, 0, 10);
        assertThat(result).isNotNull();
    }

    @Test
    void customerSearch_withKeyword() {
        List<CustomerResponse> result = customerQueryMapper.search(1L, "all", "name", "테스트", 0, 10);
        assertThat(result).isNotNull();
    }

    @Test
    void customerSearch_phoneKeyword() {
        List<CustomerResponse> result = customerQueryMapper.search(1L, "all", "phone", "010", 0, 10);
        assertThat(result).isNotNull();
    }

    @Test
    void customerSearch_newFilter() {
        List<CustomerResponse> result = customerQueryMapper.search(1L, "new", null, null, 0, 10);
        assertThat(result).isNotNull();
    }

    @Test
    void customerCount() {
        int count = customerQueryMapper.count(1L, "all", null, null);
        assertThat(count).isGreaterThanOrEqualTo(0);
    }

    // ── Notice (관리자) ──

    @Test
    void noticeSearch_noFilter() {
        List<NoticeListResponse> result = noticeQueryMapper.search(1L, "all", null, 0, 10);
        assertThat(result).isNotNull();
    }

    @Test
    void noticeSearch_withCategoryAndKeyword() {
        List<NoticeListResponse> result = noticeQueryMapper.search(1L, "스터디시간", "테스트", 0, 10);
        assertThat(result).isNotNull();
    }

    @Test
    void noticeCount() {
        int count = noticeQueryMapper.count(1L, "all", null);
        assertThat(count).isGreaterThanOrEqualTo(0);
    }

    // ── Notice (공개 게시판) ──

    @Test
    void noticeSearchPublic_noFilter() {
        List<NoticeListResponse> result = noticeQueryMapper.searchPublic("all", null, 0, 12);
        assertThat(result).isNotNull();
    }

    @Test
    void noticeSearchPublic_withFilter() {
        List<NoticeListResponse> result = noticeQueryMapper.searchPublic("스터디시간", "키워드", 0, 12);
        assertThat(result).isNotNull();
    }

    @Test
    void noticeCountPublic() {
        int count = noticeQueryMapper.countPublic("all", null);
        assertThat(count).isGreaterThanOrEqualTo(0);
    }

    // ── Postponement ──

    @Test
    void postponementSearch_noFilter() {
        List<PostponementResponse> result = postponementQueryMapper.search(1L, null, null, 0, 20);
        assertThat(result).isNotNull();
    }

    @Test
    void postponementSearch_withStatusAndKeyword() {
        List<PostponementResponse> result = postponementQueryMapper.search(1L, "대기", "홍길동", 0, 20);
        assertThat(result).isNotNull();
    }

    @Test
    void postponementCount() {
        int count = postponementQueryMapper.count(1L, null, null);
        assertThat(count).isGreaterThanOrEqualTo(0);
    }

    // ── Refund ──

    @Test
    void refundSearch_noFilter() {
        List<RefundResponse> result = refundQueryMapper.search(1L, null, null, 0, 20);
        assertThat(result).isNotNull();
    }

    @Test
    void refundSearch_withStatusAndKeyword() {
        List<RefundResponse> result = refundQueryMapper.search(1L, "대기", "홍길동", 0, 20);
        assertThat(result).isNotNull();
    }

    @Test
    void refundCount() {
        int count = refundQueryMapper.count(1L, null, null);
        assertThat(count).isGreaterThanOrEqualTo(0);
    }

    // ── ComplexMember ──

    @Test
    void complexMemberSearch_noFilter() {
        List<ComplexMemberResponse> result = complexMemberQueryMapper.search(1L, null, 0, 20);
        assertThat(result).isNotNull();
    }

    @Test
    void complexMemberSearch_withKeyword() {
        List<ComplexMemberResponse> result = complexMemberQueryMapper.search(1L, "김", 0, 20);
        assertThat(result).isNotNull();
    }

    @Test
    void complexMemberCount() {
        int count = complexMemberQueryMapper.count(1L, null);
        assertThat(count).isGreaterThanOrEqualTo(0);
    }

    // ── ComplexClass ──

    @Test
    void complexClassSearch_noFilter() {
        List<ComplexClassResponse> result = complexClassQueryMapper.search(1L, null, 0, 20);
        assertThat(result).isNotNull();
    }

    @Test
    void complexClassSearch_withKeyword() {
        List<ComplexClassResponse> result = complexClassQueryMapper.search(1L, "초급", 0, 20);
        assertThat(result).isNotNull();
    }

    @Test
    void complexClassCount() {
        int count = complexClassQueryMapper.count(1L, null);
        assertThat(count).isGreaterThanOrEqualTo(0);
    }

    // ── AttendanceView ──

    @Test
    void attendanceView_selectAttendanceView() {
        LocalDate today = LocalDate.now();
        List<AttendanceViewRow> result = attendanceViewQueryMapper.selectAttendanceView(1L, today, today.minusDays(7));
        assertThat(result).isNotNull();
    }

    @Test
    void attendanceView_selectAttendanceDetail() {
        List<AttendanceViewRow> result = attendanceViewQueryMapper.selectAttendanceDetail(1L, 1L, LocalDate.now());
        assertThat(result).isNotNull();
    }

    @Test
    void attendanceView_selectRecentHistory() {
        List<AttendanceHistoryRow> result = attendanceViewQueryMapper.selectRecentHistory(1L, 1L);
        assertThat(result).isNotNull();
    }
}
