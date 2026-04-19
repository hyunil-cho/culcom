package com.culcom.controller.complex.attendance;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberClassMappingRepository;
import com.culcom.repository.ComplexMemberRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 등록된 모든 시간대가 등록현황 뷰에 노출되는지 검증.
 * - 분반이 없는 시간대도 목록에 포함되어야 한다.
 * - 분반만 있고 회원이 없는 경우 빈 members 배열로 반환되어야 한다.
 * - 회원까지 등록된 경우 정상적으로 members가 포함되어야 한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AttendanceViewControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberClassMappingRepository mappingRepository;

    @PersistenceContext EntityManager em;

    private Branch branch;

    @BeforeEach
    void setUp() {
        branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-attn-view-" + System.nanoTime())
                .build());
    }

    private RequestPostProcessor auth() {
        CustomUserPrincipal principal = new CustomUserPrincipal(
                1L, "testuser", "테스트", UserRole.ROOT, branch.getSeq());
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    private ClassTimeSlot newSlot(String name) {
        return classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name(name).daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(11, 0))
                .build());
    }

    private ComplexClass newClass(ClassTimeSlot slot, String name) {
        return classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name(name)
                .capacity(10).sortOrder(0)
                .build());
    }

    private ComplexMember newMember(String name) {
        return memberRepository.save(ComplexMember.builder()
                .branch(branch).name(name)
                .phoneNumber("010" + (System.nanoTime() % 100000000L))
                .build());
    }

    @Test
    @DisplayName("시간대만_등록_분반_없음: 슬롯이 빈 classes 배열과 함께 반환")
    void 시간대만_등록_분반_없음() throws Exception {
        ClassTimeSlot slot = newSlot("빈슬롯-" + System.nanoTime());
        em.flush();

        mockMvc.perform(get("/api/complex/attendance/view").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[?(@.timeSlotSeq == " + slot.getSeq() + ")]").exists())
                .andExpect(jsonPath("$.data[?(@.timeSlotSeq == " + slot.getSeq() + ")].classes.length()")
                        .value(org.hamcrest.Matchers.contains(0)));
    }

    @Test
    @DisplayName("분반은_있지만_회원_없음: 슬롯에 분반은 있고 members는 빈 배열")
    void 분반은_있지만_회원_없음() throws Exception {
        ClassTimeSlot slot = newSlot("분반만-" + System.nanoTime());
        ComplexClass clazz = newClass(slot, "분반A-" + System.nanoTime());
        em.flush();

        mockMvc.perform(get("/api/complex/attendance/view").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[?(@.timeSlotSeq == " + slot.getSeq() + ")].classes.length()")
                        .value(org.hamcrest.Matchers.contains(1)))
                .andExpect(jsonPath("$.data[?(@.timeSlotSeq == " + slot.getSeq() + ")].classes[0].classSeq")
                        .value(org.hamcrest.Matchers.contains(clazz.getSeq().intValue())))
                .andExpect(jsonPath("$.data[?(@.timeSlotSeq == " + slot.getSeq() + ")].classes[0].members.length()")
                        .value(org.hamcrest.Matchers.contains(0)));
    }

    @Test
    @DisplayName("회원까지_등록: 슬롯→분반→회원이 모두 반환")
    void 회원까지_등록() throws Exception {
        ClassTimeSlot slot = newSlot("완전-" + System.nanoTime());
        ComplexClass clazz = newClass(slot, "분반B-" + System.nanoTime());
        ComplexMember member = newMember("홍길동-" + System.nanoTime());
        mappingRepository.save(ComplexMemberClassMapping.builder()
                .member(member).complexClass(clazz).sortOrder(0)
                .build());
        em.flush();

        mockMvc.perform(get("/api/complex/attendance/view").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[?(@.timeSlotSeq == " + slot.getSeq() + ")].classes[0].classSeq")
                        .value(org.hamcrest.Matchers.contains(clazz.getSeq().intValue())))
                .andExpect(jsonPath("$.data[?(@.timeSlotSeq == " + slot.getSeq() + ")].classes[0].members.length()")
                        .value(org.hamcrest.Matchers.contains(1)))
                .andExpect(jsonPath("$.data[?(@.timeSlotSeq == " + slot.getSeq() + ")].classes[0].members[0].memberSeq")
                        .value(org.hamcrest.Matchers.contains(member.getSeq().intValue())));
    }
}
