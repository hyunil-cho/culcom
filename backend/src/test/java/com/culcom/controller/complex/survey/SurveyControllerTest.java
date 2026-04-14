package com.culcom.controller.complex.survey;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.survey.*;
import com.culcom.entity.enums.InputType;
import com.culcom.entity.enums.SurveyStatus;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.SurveyQueryMapper;
import com.culcom.service.SurveyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SurveyControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean SurveyService surveyService;
    @MockBean SurveyQueryMapper surveyQueryMapper;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 1L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
            principal, null,
            List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    // ========== 설문 제출 ==========

    @Test
    void 설문제출_목록_조회() throws Exception {
        SurveySubmissionRow row = new SurveySubmissionRow();
        row.setSeq(1L);
        row.setName("홍길동");
        row.setPhoneNumber("01012345678");
        row.setTemplateName("회원가입 설문");
        row.setCreatedDate("2026-04-10");

        given(surveyQueryMapper.selectSubmissions(eq(1L))).willReturn(List.of(row));

        mockMvc.perform(get("/api/complex/survey/submissions")
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("홍길동"));
    }

    @Test
    void 설문제출_상세_조회() throws Exception {
        SurveySubmissionDetailRow detail = new SurveySubmissionDetailRow();
        detail.setSeq(1L);
        detail.setTemplateName("회원가입 설문");
        detail.setName("홍길동");
        detail.setPhoneNumber("01012345678");

        given(surveyService.getSubmissionDetail(eq(1L))).willReturn(detail);

        mockMvc.perform(get("/api/complex/survey/submissions/{seq}", 1L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("홍길동"));
    }

    // ========== 설문 템플릿 CRUD ==========

    @Test
    void 설문템플릿_목록_조회() throws Exception {
        SurveyTemplateResponse template = SurveyTemplateResponse.builder()
                .seq(1L).name("회원가입 설문").description("신규 회원용")
                .status(SurveyStatus.활성).createdDate(LocalDateTime.now())
                .optionCount(5).build();

        given(surveyService.listTemplates(eq(1L))).willReturn(List.of(template));

        mockMvc.perform(get("/api/complex/survey/templates")
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("회원가입 설문"));
    }

    @Test
    void 설문템플릿_단건_조회() throws Exception {
        SurveyTemplateResponse template = SurveyTemplateResponse.builder()
                .seq(1L).name("회원가입 설문").description("신규 회원용")
                .status(SurveyStatus.활성).build();

        given(surveyService.getTemplate(eq(1L))).willReturn(template);

        mockMvc.perform(get("/api/complex/survey/templates/{seq}", 1L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("회원가입 설문"));
    }

    @Test
    void 설문템플릿_생성_성공() throws Exception {
        SurveyTemplateResponse response = SurveyTemplateResponse.builder()
                .seq(1L).name("새 설문").description("설명")
                .status(SurveyStatus.작성중).build();

        given(surveyService.createTemplate(any(), eq(1L))).willReturn(response);

        Map<String, Object> body = Map.of(
                "name", "새 설문",
                "description", "설명");

        mockMvc.perform(post("/api/complex/survey/templates")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("설문지 생성 완료"))
                .andExpect(jsonPath("$.data.name").value("새 설문"));
    }

    @Test
    void 설문템플릿_생성시_name_빈값이면_400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "");
        body.put("description", "설명");

        mockMvc.perform(post("/api/complex/survey/templates")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 설문템플릿_수정_성공() throws Exception {
        SurveyTemplateResponse response = SurveyTemplateResponse.builder()
                .seq(1L).name("수정된 설문").description("수정 설명").build();

        given(surveyService.updateTemplate(eq(1L), any())).willReturn(response);

        Map<String, Object> body = Map.of(
                "name", "수정된 설문",
                "description", "수정 설명");

        mockMvc.perform(put("/api/complex/survey/templates/{seq}", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("설문지가 수정되었습니다."))
                .andExpect(jsonPath("$.data.name").value("수정된 설문"));
    }

    @Test
    void 설문템플릿_복제_성공() throws Exception {
        SurveyTemplateResponse response = SurveyTemplateResponse.builder()
                .seq(2L).name("회원가입 설문 (복사)").build();

        given(surveyService.copyTemplate(eq(1L), eq(1L))).willReturn(response);

        mockMvc.perform(post("/api/complex/survey/templates/{seq}/copy", 1L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("설문지가 복제되었습니다."))
                .andExpect(jsonPath("$.data.seq").value(2));
    }

    @Test
    void 설문템플릿_삭제_성공() throws Exception {
        willDoNothing().given(surveyService).deleteTemplate(eq(1L));

        mockMvc.perform(delete("/api/complex/survey/templates/{seq}", 1L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("설문지가 삭제되었습니다."));
    }

    // ========== 섹션 ==========

    @Test
    void 섹션_생성_성공() throws Exception {
        SurveySectionResponse response = SurveySectionResponse.builder()
                .seq(1L).templateSeq(10L).title("기본 정보").sortOrder(1).build();

        given(surveyService.createSection(eq(10L), any())).willReturn(response);

        Map<String, Object> body = Map.of("title", "기본 정보");

        mockMvc.perform(post("/api/complex/survey/templates/{templateSeq}/sections", 10L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("섹션 추가 완료"))
                .andExpect(jsonPath("$.data.title").value("기본 정보"));
    }

    // ========== 질문 ==========

    @Test
    void 질문_생성_성공() throws Exception {
        SurveyQuestionResponse response = SurveyQuestionResponse.builder()
                .seq(1L).templateSeq(10L).sectionSeq(1L)
                .questionKey("q1").title("이름을 입력하세요")
                .inputType(InputType.text).sortOrder(1).required(true)
                .build();

        given(surveyService.createQuestion(eq(10L), any())).willReturn(response);

        Map<String, Object> body = new HashMap<>();
        body.put("sectionSeq", 1L);
        body.put("questionKey", "q1");
        body.put("title", "이름을 입력하세요");
        body.put("inputType", "text");
        body.put("sortOrder", 1);
        body.put("required", true);

        mockMvc.perform(post("/api/complex/survey/templates/{templateSeq}/questions", 10L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("질문 추가 완료"))
                .andExpect(jsonPath("$.data.title").value("이름을 입력하세요"));
    }

    // ========== 선택지 ==========

    @Test
    void 선택지_생성_성공() throws Exception {
        SurveyOptionResponse response = SurveyOptionResponse.builder()
                .seq(1L).templateSeq(10L).questionSeq(1L)
                .label("옵션A").sortOrder(1).createdDate(LocalDateTime.now())
                .build();

        given(surveyService.createOption(eq(10L), any())).willReturn(response);

        Map<String, Object> body = new HashMap<>();
        body.put("questionSeq", 1L);
        body.put("label", "옵션A");

        mockMvc.perform(post("/api/complex/survey/templates/{templateSeq}/options", 10L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("선택지 추가 완료"))
                .andExpect(jsonPath("$.data.label").value("옵션A"));
    }

    // ========== 인증 ==========

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/complex/survey/templates"))
                .andExpect(status().isUnauthorized());
    }
}
