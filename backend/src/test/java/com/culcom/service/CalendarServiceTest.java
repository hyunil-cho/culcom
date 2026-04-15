package com.culcom.service;

import com.culcom.dto.calendar.CalendarEventRequest;
import com.culcom.dto.calendar.CalendarEventResponse;
import com.culcom.entity.calendar.CalendarEvent;
import com.culcom.repository.CalendarEventRepository;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CalendarServiceTest {

    @Autowired CalendarService calendarService;
    @Autowired CalendarEventRepository calendarEventRepository;

    private static final Long BRANCH_SEQ = 1L;

    private CalendarEvent createTestEvent(String author) {
        return calendarEventRepository.save(CalendarEvent.builder()
                .branchSeq(BRANCH_SEQ)
                .title("기존 일정")
                .content("내용")
                .author(author)
                .eventDate(LocalDate.of(2026, 3, 1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .build());
    }

    private CalendarEventRequest makeRequest(String title, String eventDate, String startTime, String endTime) {
        CalendarEventRequest req = new CalendarEventRequest();
        req.setTitle(title);
        req.setEventDate(LocalDate.parse(eventDate));
        req.setStartTime(LocalTime.parse(startTime));
        req.setEndTime(LocalTime.parse(endTime));
        return req;
    }

    @Nested
    class CreateEvent {

        @Test
        void 일정_등록시_author가_세션_userId로_설정된다() {
            CalendarEventRequest req = makeRequest("새 일정", "2026-03-01", "09:00", "10:00");

            CalendarEventResponse res = calendarService.createEvent(BRANCH_SEQ, "admin", req);

            assertThat(res.getAuthor()).isEqualTo("admin");
            assertThat(res.getTitle()).isEqualTo("새 일정");
        }

        @Test
        void 종료시간이_시작시간_이전이면_실패() {
            CalendarEventRequest req = makeRequest("일정", "2026-03-01", "11:00", "10:00");

            assertThatThrownBy(() -> calendarService.createEvent(BRANCH_SEQ, "admin", req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("종료 시간");
        }
    }

    @Nested
    class UpdateEvent {

        @Test
        void 본인이_작성한_일정_수정_성공() {
            CalendarEvent event = createTestEvent("userA");

            CalendarEventRequest req = makeRequest("수정된 제목", "2026-03-02", "14:00", "15:00");
            req.setContent("수정된 내용");

            CalendarEventResponse res = calendarService.updateEvent(event.getSeq(), BRANCH_SEQ, "userA", req);

            assertThat(res.getTitle()).isEqualTo("수정된 제목");
            assertThat(res.getContent()).isEqualTo("수정된 내용");
            assertThat(res.getEventDate()).isEqualTo("2026-03-02");
            assertThat(res.getStartTime()).isEqualTo("14:00");
            assertThat(res.getEndTime()).isEqualTo("15:00");
        }

        @Test
        void 다른_사용자가_수정하면_실패() {
            CalendarEvent event = createTestEvent("userA");

            CalendarEventRequest req = makeRequest("수정 시도", "2026-03-02", "14:00", "15:00");

            assertThatThrownBy(() -> calendarService.updateEvent(event.getSeq(), BRANCH_SEQ, "userB", req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("본인이 작성한 일정만 수정");
        }

        @Test
        void 다른_지점_일정_수정하면_실패() {
            CalendarEvent event = createTestEvent("userA");

            CalendarEventRequest req = makeRequest("수정 시도", "2026-03-02", "14:00", "15:00");

            assertThatThrownBy(() -> calendarService.updateEvent(event.getSeq(), 999L, "userA", req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("해당 지점의 일정이 아닙니다");
        }

        @Test
        void 수정시_종료시간이_시작시간_이전이면_실패() {
            CalendarEvent event = createTestEvent("userA");

            CalendarEventRequest req = makeRequest("수정", "2026-03-02", "15:00", "14:00");

            assertThatThrownBy(() -> calendarService.updateEvent(event.getSeq(), BRANCH_SEQ, "userA", req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("종료 시간");
        }

        @Test
        void 수정해도_author는_변경되지_않는다() {
            CalendarEvent event = createTestEvent("userA");

            CalendarEventRequest req = makeRequest("수정된 제목", "2026-03-02", "14:00", "15:00");

            CalendarEventResponse res = calendarService.updateEvent(event.getSeq(), BRANCH_SEQ, "userA", req);

            assertThat(res.getAuthor()).isEqualTo("userA");
        }
    }
}
