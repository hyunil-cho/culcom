package com.culcom.controller.message;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.UserRole;
import com.culcom.entity.message.MessageTemplate;
import com.culcom.entity.message.Placeholder;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.MessageTemplateRepository;
import com.culcom.repository.PlaceholderRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * MessageTemplateController 통합 테스트
 * — CRUD, 기본값 설정, 플레이스홀더 조회, resolve API 검증
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MessageTemplateControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired BranchRepository branchRepository;
    @Autowired MessageTemplateRepository templateRepository;
    @Autowired PlaceholderRepository placeholderRepository;

    private Branch branch;
    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("ctrl-test-" + System.nanoTime())
                .address("서울시 강남구")
                .branchManager("김매니저")
                .directions("3번 출구 도보 5분")
                .build());

        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, branch.getSeq());
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    private MessageTemplate createTemplate(String name, String content) {
        return templateRepository.save(MessageTemplate.builder()
                .templateName(name)
                .messageContext(content)
                .branch(branch)
                .eventType(com.culcom.entity.enums.SmsEventType.회원등록)
                .build());
    }

    // ========== 목록 조회 ==========

    @Nested
    class ListAll {

        @Test
        void 지점별_템플릿_목록_조회() throws Exception {
            createTemplate("템플릿A", "내용A");
            createTemplate("템플릿B", "내용B");

            mockMvc.perform(get("/api/message-templates").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(2)));
        }

        @Test
        void 다른_지점_템플릿은_조회되지_않음() throws Exception {
            createTemplate("같은지점", "내용");

            Branch otherBranch = branchRepository.save(Branch.builder()
                    .branchName("다른지점").alias("other-" + System.nanoTime()).build());
            templateRepository.save(MessageTemplate.builder()
                    .templateName("다른지점템플릿").messageContext("다른내용").branch(otherBranch)
                    .eventType(com.culcom.entity.enums.SmsEventType.회원등록).build());

            mockMvc.perform(get("/api/message-templates").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].templateName").value("같은지점"));
        }

        @Test
        void 인증_없으면_401() throws Exception {
            mockMvc.perform(get("/api/message-templates"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ========== 단건 조회 ==========

    @Nested
    class Get {

        @Test
        void 템플릿_단건_조회() throws Exception {
            MessageTemplate t = createTemplate("조회용", "내용입니다");

            mockMvc.perform(get("/api/message-templates/{seq}", t.getSeq()).with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.templateName").value("조회용"))
                    .andExpect(jsonPath("$.data.messageContext").value("내용입니다"));
        }

        @Test
        void 존재하지_않는_템플릿_조회시_404() throws Exception {
            mockMvc.perform(get("/api/message-templates/{seq}", 99999L).with(auth()))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    // ========== 생성 ==========

    @Nested
    class Create {

        @Test
        void 템플릿_생성_성공() throws Exception {
            Map<String, Object> body = Map.of(
                    "templateName", "새 템플릿",
                    "messageContext", "{{고객명}}님 안녕하세요",
                    "isActive", true,
                    "eventType", "회원등록");

            mockMvc.perform(post("/api/message-templates")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("템플릿 추가 완료"))
                    .andExpect(jsonPath("$.data.templateName").value("새 템플릿"))
                    .andExpect(jsonPath("$.data.messageContext").value("{{고객명}}님 안녕하세요"))
                    .andExpect(jsonPath("$.data.eventType").value("회원등록"));
        }

        @Test
        void templateName이_빈값이면_400() throws Exception {
            Map<String, Object> body = Map.of(
                    "templateName", "",
                    "messageContext", "내용");

            mockMvc.perform(post("/api/message-templates")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        void messageContext가_없으면_400() throws Exception {
            Map<String, String> body = Map.of("templateName", "이름만");

            mockMvc.perform(post("/api/message-templates")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    // ========== 수정 ==========

    @Nested
    class Update {

        @Test
        void 템플릿_수정_성공() throws Exception {
            MessageTemplate t = createTemplate("원본", "원본 내용");

            Map<String, Object> body = Map.of(
                    "templateName", "수정됨",
                    "messageContext", "수정된 내용",
                    "isActive", false);

            mockMvc.perform(put("/api/message-templates/{seq}", t.getSeq())
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("템플릿 수정 완료"))
                    .andExpect(jsonPath("$.data.templateName").value("수정됨"))
                    .andExpect(jsonPath("$.data.messageContext").value("수정된 내용"))
                    .andExpect(jsonPath("$.data.isActive").value(false));
        }

        @Test
        void 존재하지_않는_템플릿_수정시_404() throws Exception {
            Map<String, Object> body = Map.of(
                    "templateName", "수정",
                    "messageContext", "내용");

            mockMvc.perform(put("/api/message-templates/{seq}", 99999L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isNotFound());
        }
    }

    // ========== 삭제 ==========

    @Nested
    class Delete {

        @Test
        void 템플릿_삭제_성공() throws Exception {
            MessageTemplate t = createTemplate("삭제용", "내용");

            mockMvc.perform(delete("/api/message-templates/{seq}", t.getSeq()).with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("템플릿 삭제 완료"));

            // 삭제 후 조회 시 404
            mockMvc.perform(get("/api/message-templates/{seq}", t.getSeq()).with(auth()))
                    .andExpect(status().isNotFound());
        }
    }

    // ========== 기본 템플릿 설정 ==========

    @Nested
    class SetDefault {

        @Test
        void 기본_템플릿_설정_성공() throws Exception {
            MessageTemplate t = createTemplate("기본후보", "내용");

            mockMvc.perform(post("/api/message-templates/{seq}/set-default", t.getSeq())
                            .with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("기본 템플릿 설정 완료"));

            // 조회 시 isDefault가 true인지 확인
            mockMvc.perform(get("/api/message-templates/{seq}", t.getSeq()).with(auth()))
                    .andExpect(jsonPath("$.data.isDefault").value(true));
        }

        @Test
        void 기존_기본_템플릿이_해제됨() throws Exception {
            MessageTemplate first = createTemplate("기존기본", "내용1");
            MessageTemplate second = createTemplate("새기본", "내용2");

            // first를 기본으로
            mockMvc.perform(post("/api/message-templates/{seq}/set-default", first.getSeq())
                    .with(auth()));

            // second를 기본으로 변경
            mockMvc.perform(post("/api/message-templates/{seq}/set-default", second.getSeq())
                    .with(auth()));

            // first는 기본 해제, second가 기본
            mockMvc.perform(get("/api/message-templates/{seq}", first.getSeq()).with(auth()))
                    .andExpect(jsonPath("$.data.isDefault").value(false));
            mockMvc.perform(get("/api/message-templates/{seq}", second.getSeq()).with(auth()))
                    .andExpect(jsonPath("$.data.isDefault").value(true));
        }
    }

    // ========== 플레이스홀더 조회 ==========

    @Nested
    class GetPlaceholders {

        @Test
        void 플레이스홀더_목록_조회() throws Exception {
            // DataInitializer가 test에서는 동작하지 않을 수 있으므로 직접 세팅
            placeholderRepository.deleteAll();
            placeholderRepository.save(Placeholder.builder()
                    .name("{{고객명}}").value("{customer.name}").comment("고객 이름").category(com.culcom.entity.enums.PlaceholderCategory.COMMON).build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{전화번호}}").value("{customer.phone_number}").comment("전화번호").category(com.culcom.entity.enums.PlaceholderCategory.COMMON).build());

            mockMvc.perform(get("/api/message-templates/placeholders").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[0].name").value("{{고객명}}"));
        }
    }

    // ========== resolve (미리보기) ==========

    @Nested
    class Resolve {

        @BeforeEach
        void setUpPlaceholders() {
            placeholderRepository.deleteAll();
            placeholderRepository.save(Placeholder.builder()
                    .name("{{고객명}}").value("{customer.name}").comment("고객 이름").category(com.culcom.entity.enums.PlaceholderCategory.COMMON).build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{전화번호}}").value("{customer.phone_number}").comment("전화번호").category(com.culcom.entity.enums.PlaceholderCategory.COMMON).build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{지점명}}").value("{branch.name}").comment("지점 이름").category(com.culcom.entity.enums.PlaceholderCategory.COMMON).build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{지점주소}}").value("{branch.address}").comment("주소").category(com.culcom.entity.enums.PlaceholderCategory.COMMON).build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{예약일자}}").value("{reservation.interview_date}").comment("예약일").category(com.culcom.entity.enums.PlaceholderCategory.RESERVATION).build());
        }

        @Test
        void 고객정보_치환() throws Exception {
            MessageTemplate t = createTemplate("테스트", "{{고객명}}님({{전화번호}}) 환영합니다");

            Map<String, String> body = Map.of(
                    "customerName", "홍길동",
                    "customerPhone", "01012345678");

            mockMvc.perform(post("/api/message-templates/{seq}/resolve", t.getSeq())
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").value("홍길동님(01012345678) 환영합니다"));
        }

        @Test
        void 지점정보_자동_주입() throws Exception {
            MessageTemplate t = createTemplate("지점", "{{지점명}} - {{지점주소}}");

            mockMvc.perform(post("/api/message-templates/{seq}/resolve", t.getSeq())
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").value("테스트지점 - 서울시 강남구"));
        }

        @Test
        void 예약일시_치환() throws Exception {
            MessageTemplate t = createTemplate("예약", "예약일: {{예약일자}}");

            Map<String, String> body = Map.of("interviewDate", "2026-05-01 14:30");

            mockMvc.perform(post("/api/message-templates/{seq}/resolve", t.getSeq())
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").value("예약일: 2026-05-01 14:30"));
        }

        @Test
        void 복합_치환_고객_지점_예약() throws Exception {
            MessageTemplate t = createTemplate("복합", "{{고객명}}님, {{지점명}}에 {{예약일자}} 예약입니다");

            Map<String, String> body = Map.of(
                    "customerName", "홍길동",
                    "interviewDate", "2026-05-01 14:30");

            mockMvc.perform(post("/api/message-templates/{seq}/resolve", t.getSeq())
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").value("홍길동님, 테스트지점에 2026-05-01 14:30 예약입니다"));
        }

        @Test
        void 빈_요청이면_지점정보만_치환되고_나머지는_빈문자열() throws Exception {
            MessageTemplate t = createTemplate("빈요청", "{{고객명}} / {{지점명}}");

            mockMvc.perform(post("/api/message-templates/{seq}/resolve", t.getSeq())
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").value(" / 테스트지점"));
        }

        @Test
        void 존재하지_않는_템플릿_resolve시_404() throws Exception {
            mockMvc.perform(post("/api/message-templates/{seq}/resolve", 99999L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        void 플레이스홀더가_없는_일반_텍스트는_그대로() throws Exception {
            MessageTemplate t = createTemplate("일반", "안녕하세요 반갑습니다");

            mockMvc.perform(post("/api/message-templates/{seq}/resolve", t.getSeq())
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").value("안녕하세요 반갑습니다"));
        }

        @Test
        void 인증_없으면_401() throws Exception {
            MessageTemplate t = createTemplate("인증", "내용");

            mockMvc.perform(post("/api/message-templates/{seq}/resolve", t.getSeq())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());
        }
    }
}
