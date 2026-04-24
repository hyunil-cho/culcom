package com.culcom.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.Signature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

/**
 * {@link ControllerResponseLogAspect} 로깅 동작 단위 테스트.
 * aspect는 단순 로거이므로, AOP 프록시 없이 {@link ProceedingJoinPoint}를 목으로 감싸
 * 응답 상태에 따른 로그 레벨 분기를 검증한다.
 */
class ControllerResponseLogAspectTest {

    private ControllerResponseLogAspect aspect;
    private ListAppender<ILoggingEvent> appender;
    private Logger logger;

    @BeforeEach
    void setUp() {
        aspect = new ControllerResponseLogAspect();
        logger = (Logger) LoggerFactory.getLogger(ControllerResponseLogAspect.class);
        logger.setLevel(Level.DEBUG);

        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(appender);
    }

    private ProceedingJoinPoint mockJoinPoint(Object returnValue) throws Throwable {
        ProceedingJoinPoint jp = mock(ProceedingJoinPoint.class);
        Signature sig = mock(Signature.class);
        given(sig.getDeclaringType()).willReturn((Class) SampleCtrl.class);
        given(sig.getName()).willReturn("handle");
        given(jp.getSignature()).willReturn(sig);
        given(jp.getArgs()).willReturn(new Object[]{"arg1", 42});
        given(jp.proceed()).willReturn(returnValue);
        return jp;
    }

    @Test
    @DisplayName("2xx_응답은_debug_로만_로깅_info는_없어야")
    void 정상응답_debug만() throws Throwable {
        ProceedingJoinPoint jp = mockJoinPoint(ResponseEntity.ok("ok"));

        Object result = aspect.logRequestAndResponse(jp);

        assertThat(result).isInstanceOf(ResponseEntity.class);
        List<ILoggingEvent> infoEvents = appender.list.stream()
                .filter(e -> e.getLevel() == Level.INFO).toList();
        assertThat(infoEvents).isEmpty();

        List<ILoggingEvent> debugEvents = appender.list.stream()
                .filter(e -> e.getLevel() == Level.DEBUG).toList();
        assertThat(debugEvents).hasSize(2);
    }

    @Test
    @DisplayName("4xx_응답은_info_레벨_추가_로깅")
    void 에러응답_info로깅() throws Throwable {
        ProceedingJoinPoint jp = mockJoinPoint(ResponseEntity.badRequest().body("bad"));

        aspect.logRequestAndResponse(jp);

        List<ILoggingEvent> infoEvents = appender.list.stream()
                .filter(e -> e.getLevel() == Level.INFO).toList();
        assertThat(infoEvents).hasSize(1);
        assertThat(infoEvents.get(0).getFormattedMessage()).contains("400");
    }

    @Test
    @DisplayName("5xx_응답도_info_레벨_추가_로깅")
    void 서버에러_info로깅() throws Throwable {
        ProceedingJoinPoint jp = mockJoinPoint(
                ResponseEntity.status(500).body("server error"));

        aspect.logRequestAndResponse(jp);

        List<ILoggingEvent> infoEvents = appender.list.stream()
                .filter(e -> e.getLevel() == Level.INFO).toList();
        assertThat(infoEvents).hasSize(1);
        assertThat(infoEvents.get(0).getFormattedMessage()).contains("500");
    }

    @Test
    @DisplayName("ResponseEntity가_아니면_응답_로깅_없이_그대로_반환")
    void 비_응답엔티티_반환() throws Throwable {
        ProceedingJoinPoint jp = mockJoinPoint("plain string");

        Object result = aspect.logRequestAndResponse(jp);

        assertThat(result).isEqualTo("plain string");
        // request 로깅은 1번 찍히지만 응답 로깅은 없어야 함
        List<ILoggingEvent> debugEvents = appender.list.stream()
                .filter(e -> e.getLevel() == Level.DEBUG).toList();
        assertThat(debugEvents).hasSize(1);
        assertThat(debugEvents.get(0).getFormattedMessage()).contains(">>>");
    }

    @Test
    @DisplayName("컨트롤러_예외_발생시_예외가_그대로_전파")
    void 예외_전파() throws Throwable {
        ProceedingJoinPoint jp = mock(ProceedingJoinPoint.class);
        Signature sig = mock(Signature.class);
        given(sig.getDeclaringType()).willReturn((Class) SampleCtrl.class);
        given(sig.getName()).willReturn("handle");
        given(jp.getSignature()).willReturn(sig);
        given(jp.getArgs()).willReturn(new Object[]{});
        given(jp.proceed()).willThrow(new IllegalStateException("boom"));

        assertThatThrownBy(() -> aspect.logRequestAndResponse(jp))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("boom");
    }

    private static class SampleCtrl {}
}
