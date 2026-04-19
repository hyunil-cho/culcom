package com.culcom.config;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UniqueConstraintExceptionTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired BranchRepository branchRepository;

    private Long branchSeq;

    @BeforeEach
    void setUp() {
        Branch branch = branchRepository.save(
                Branch.builder().branchName("테스트지점").alias("test-uc-" + System.nanoTime()).build());
        branchSeq = branch.getSeq();
    }

    private RequestPostProcessor auth() {
        CustomUserPrincipal principal =
                new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, branchSeq);
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_ROOT")));
        return authentication(token);
    }

    @Nested
    @DisplayName("Customer 유니크 제약조건 (name + phoneNumber)")
    class CustomerUniqueConstraint {

        @Test
        @DisplayName("동일한 이름+전화번호로 두 번 등록하면 409 Conflict 반환")
        void duplicateCustomer_returns409() throws Exception {
            Map<String, String> request = Map.of(
                    "name", "홍길동",
                    "phoneNumber", "010-1111-2222"
            );
            String body = objectMapper.writeValueAsString(request);

            // 첫 번째 등록 — 성공
            mockMvc.perform(post("/api/customers")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk());

            // 동일 데이터 재등록 — 유니크 제약조건 위반
            mockMvc.perform(post("/api/customers")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("데이터 제약 조건에 위배됩니다. 중복되거나 참조 중인 데이터가 있는지 확인해주세요.")));
        }
    }

    @Nested
    @DisplayName("ComplexMember 유니크 제약조건 (name + phone_number)")
    class ComplexMemberUniqueConstraint {

        @Test
        @DisplayName("동일한 이름+전화번호로 두 번 등록하면 409 Conflict 반환")
        void duplicateComplexMember_returns409() throws Exception {
            Map<String, String> request = Map.of(
                    "name", "김영희",
                    "phoneNumber", "010-3333-4444"
            );
            String body = objectMapper.writeValueAsString(request);

            // 첫 번째 등록 — 성공
            mockMvc.perform(post("/api/complex/members")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk());

            // 동일 데이터 재등록 — 유니크 제약조건 위반
            mockMvc.perform(post("/api/complex/members")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("데이터 제약 조건에 위배됩니다. 중복되거나 참조 중인 데이터가 있는지 확인해주세요.")));
        }
    }
}
