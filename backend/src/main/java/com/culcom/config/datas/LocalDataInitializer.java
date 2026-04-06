package com.culcom.config.datas;

import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.*;
import com.culcom.entity.product.Membership;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.*;
import com.culcom.entity.message.MessageTemplate;
import com.culcom.entity.notice.Notice;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Slf4j
@Component
@Profile({"local"})
@DependsOn("dataInitializer")
@RequiredArgsConstructor
public class LocalDataInitializer implements ApplicationRunner {

    private final UserInfoRepository userInfoRepository;
    private final BranchRepository branchRepository;
    private final MessageTemplateRepository messageTemplateRepository;
    private final CustomerRepository customerRepository;
    private final ClassTimeSlotRepository classTimeSlotRepository;
    private final ComplexClassRepository complexClassRepository;
    private final ComplexMemberRepository complexMemberRepository;
    private final MembershipRepository membershipRepository;
    private final ComplexMemberMembershipRepository complexMemberMembershipRepository;
    private final ComplexMemberClassMappingRepository complexMemberClassMappingRepository;
    private final ComplexMemberAttendanceRepository complexMemberAttendanceRepository;
    private final MembershipActivityLogRepository membershipActivityLogRepository;
    private final NoticeRepository noticeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (userInfoRepository.findByUserId("user").isPresent()) return;

        UserInfo manager = userInfoRepository.save(UserInfo.builder()
                .userId("user").userPassword(passwordEncoder.encode("user"))
                .role(UserRole.BRANCH_MANAGER).name("조현일").phone("01099321967").build());
        log.info("초기 계정 생성: user/user (BRANCH_MANAGER, 조현일)");

        Branch gangnam = branchRepository.save(Branch.builder()
                .branchName("강남점").alias("gangnam").branchManager("조현일")
                .address("서울특별시 강남구 테헤란로 123").directions("2호선 강남역 3번 출구 도보 5분")
                .createdBy(manager).build());

        Branch seocho = branchRepository.save(Branch.builder()
                .branchName("서초점").alias("seocho").branchManager("김서연")
                .address("서울특별시 서초구 서초대로 456").directions("3호선 교대역 1번 출구 도보 3분")
                .createdBy(manager).build());

        log.info("지점 2개 생성: 강남점, 서초점");

        initTemplates(gangnam);
        initCustomers(gangnam);
        initNotices(gangnam);
        initComplexData(gangnam, seocho);
    }

    private void initTemplates(Branch branch) {
        messageTemplateRepository.save(MessageTemplate.builder()
                .branch(branch).templateName("예약 확인 안내")
                .description("예약 확정 시 고객에게 보내는 안내 메시지")
                .messageContext("안녕하세요 {{고객명}}님, {{지점명}}입니다.\n{{예약일자}}에 예약이 확정되었습니다.\n주소: {{지점주소}}\n오시는 길: {{오시는길}}\n감사합니다.")
                .isDefault(true).isActive(true).build());
        messageTemplateRepository.save(MessageTemplate.builder()
                .branch(branch).templateName("방문 안내")
                .description("첫 방문 고객에게 보내는 안내 메시지")
                .messageContext("{{고객명}}님 안녕하세요.\n{{지점명}}에 관심을 가져주셔서 감사합니다.\n궁금하신 점은 담당자 {{담당자}}에게 연락 주세요.\n감사합니다.")
                .isActive(true).build());
        log.info("메시지 템플릿 2건 생성");
    }

    private void initCustomers(Branch branch) {
        String[][] data = {
                {"홍길동", "01099321967", "네이버 광고", "블로그", ""},
                {"김철수", "01012345678", "인스타그램", "SNS", "영어 수업 관심"},
                {"이영희", "01098765432", "카카오 광고", "검색", ""},
                {"박민수", "01011223344", "구글 광고", "검색", "주말반 문의"},
                {"최지영", "01055667788", "네이버 광고", "블로그", "레벨테스트 희망"},
                {"정우성", "01022334455", "지인소개", "소개", ""},
                {"한소희", "01033445566", "인스타그램", "SNS", "초급 문의"},
                {"윤서준", "01044556677", "페이스북", "SNS", "주 3회 가능"},
                {"강다니엘", "01066778899", "카카오 광고", "검색", ""},
                {"송혜교", "01077889900", "네이버 광고", "블로그", "중급 이상 희망"},
                {"이준혁", "01088990011", "지인소개", "소개", "저녁반 선호"},
                {"김나영", "01099001122", "인스타그램", "SNS", ""},
                {"오세훈", "01010112233", "구글 광고", "검색", "토요일 수업 문의"},
                {"장원영", "01021223344", "틱톡", "SNS", "회화 위주"},
                {"류준열", "01032334455", "네이버 광고", "블로그", ""},
        };
        CustomerStatus[] statuses = {
                CustomerStatus.신규, CustomerStatus.신규, CustomerStatus.신규,
                CustomerStatus.진행중, CustomerStatus.진행중, CustomerStatus.예약확정,
                CustomerStatus.신규, CustomerStatus.콜수초과, CustomerStatus.신규,
                CustomerStatus.진행중, CustomerStatus.신규, CustomerStatus.전화상거절,
                CustomerStatus.신규, CustomerStatus.신규, CustomerStatus.진행중,
        };
        int[] callCounts = {0, 0, 0, 2, 3, 4, 0, 5, 1, 2, 0, 3, 0, 0, 1};

        for (int i = 0; i < data.length; i++) {
            customerRepository.save(Customer.builder()
                    .branch(branch).name(data[i][0]).phoneNumber(data[i][1])
                    .commercialName(data[i][2]).adSource(data[i][3])
                    .comment(data[i][4].isEmpty() ? null : data[i][4])
                    .status(statuses[i]).callCount(callCounts[i]).build());
        }
        log.info("고객 {}건 생성", data.length);
    }

    private void initNotices(Branch branch) {
        noticeRepository.save(Notice.builder()
                .branch(branch).title("4월 수업 시간표 변경 안내")
                .content("4월부터 평일 오전반 수업 시간이 10:00 → 09:30으로 변경됩니다.\n자세한 사항은 담당 선생님께 문의해 주세요.")
                .category(NoticeCategory.공지사항).isPinned(true).isActive(true).createdBy("관리자").build());
        noticeRepository.save(Notice.builder()
                .branch(branch).title("봄맞이 신규 회원 이벤트")
                .content("3~4월 신규 가입 시 첫 달 20% 할인!\n문의: 02-1234-5678")
                .category(NoticeCategory.이벤트).isPinned(false).isActive(true).createdBy("관리자")
                .eventStartDate(LocalDate.of(2026, 3, 1)).eventEndDate(LocalDate.of(2026, 4, 30)).build());
        log.info("공지사항 2건 생성");
    }

    private void initComplexData(Branch gangnam, Branch seocho) {
        // ── 시간대 ──
        ClassTimeSlot ts1 = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(gangnam).name("평일 오전반").daysOfWeek("월,수,금")
                .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(11, 30)).build());
        ClassTimeSlot ts2 = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(gangnam).name("평일 오후반").daysOfWeek("월,수,금")
                .startTime(LocalTime.of(14, 0)).endTime(LocalTime.of(15, 30)).build());
        ClassTimeSlot ts3 = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(gangnam).name("평일 저녁반").daysOfWeek("화,목")
                .startTime(LocalTime.of(19, 0)).endTime(LocalTime.of(20, 30)).build());
        ClassTimeSlot ts4 = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(gangnam).name("주말 오전반").daysOfWeek("토")
                .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(12, 0)).build());
        ClassTimeSlot ts5 = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(seocho).name("평일 오전반").daysOfWeek("월,수,금")
                .startTime(LocalTime.of(9, 30)).endTime(LocalTime.of(11, 0)).build());
        ClassTimeSlot ts6 = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(seocho).name("평일 오후반").daysOfWeek("화,목")
                .startTime(LocalTime.of(13, 0)).endTime(LocalTime.of(14, 30)).build());
        log.info("시간대 6개 생성");

        // ── 스태프 (ComplexMember + ComplexStaffInfo) ──
        ComplexMember staff1 = createStaff(gangnam, "이민호", "01077778888");
        ComplexMember staff2 = createStaff(gangnam, "김수진", "01066669999");
        ComplexMember staff3 = createStaff(gangnam, "마이클 존슨", "01055550000");
        ComplexMember staff4 = createStaff(gangnam, "박하나", "01044441111");
        ComplexMember staff5 = createStaff(seocho, "정예린", "01033332222");
        ComplexMember staff6 = createStaff(seocho, "제임스 리", "01022223333");
        log.info("스태프 6명 생성");

        // ── 수업 (팀) ──
        ComplexClass c1 = complexClassRepository.save(ComplexClass.builder()
                .branch(gangnam).timeSlot(ts1).staff(staff1)
                .name("기초 영어회화 A").description("왕초보를 위한 기초 영어회화").capacity(12).sortOrder(1).build());
        ComplexClass c2 = complexClassRepository.save(ComplexClass.builder()
                .branch(gangnam).timeSlot(ts1).staff(staff2)
                .name("기초 영어회화 B").description("기초 문법과 회화 병행").capacity(12).sortOrder(2).build());
        ComplexClass c3 = complexClassRepository.save(ComplexClass.builder()
                .branch(gangnam).timeSlot(ts2).staff(staff2)
                .name("중급 영어회화").description("일상 대화와 토론 중심").capacity(10).sortOrder(3).build());
        ComplexClass c4 = complexClassRepository.save(ComplexClass.builder()
                .branch(gangnam).timeSlot(ts2).staff(staff3)
                .name("프리토킹").description("원어민과 자유 대화").capacity(8).sortOrder(4).build());
        ComplexClass c5 = complexClassRepository.save(ComplexClass.builder()
                .branch(gangnam).timeSlot(ts3).staff(staff1)
                .name("비즈니스 영어").description("업무에 필요한 영어 표현").capacity(10).sortOrder(5).build());
        ComplexClass c6 = complexClassRepository.save(ComplexClass.builder()
                .branch(gangnam).timeSlot(ts3).staff(staff4)
                .name("토익 대비반").description("토익 고득점을 위한 집중반").capacity(15).sortOrder(6).build());
        ComplexClass c7 = complexClassRepository.save(ComplexClass.builder()
                .branch(gangnam).timeSlot(ts4).staff(staff3)
                .name("주말 회화반").description("주말 집중 영어회화").capacity(12).sortOrder(7).build());
        ComplexClass c8 = complexClassRepository.save(ComplexClass.builder()
                .branch(seocho).timeSlot(ts5).staff(staff5)
                .name("키즈 영어").description("초등학생 대상 영어 수업").capacity(10).sortOrder(1).build());
        ComplexClass c9 = complexClassRepository.save(ComplexClass.builder()
                .branch(seocho).timeSlot(ts5).staff(staff6)
                .name("중급 회화").description("중급 레벨 회화 수업").capacity(10).sortOrder(2).build());
        ComplexClass c10 = complexClassRepository.save(ComplexClass.builder()
                .branch(seocho).timeSlot(ts6).staff(staff5)
                .name("생활 영어").description("일상에서 쓰는 영어 표현").capacity(12).sortOrder(3).build());
        log.info("수업(팀) 10개 생성");

        LocalDate today = LocalDate.now();

        // ── 멤버십 상품 ──
        Membership mship1m = membershipRepository.save(Membership.builder().name("1개월 체험반").duration(30).count(12).price(120000).build());
        Membership mship3m = membershipRepository.save(Membership.builder().name("3개월 정규반").duration(90).count(36).price(300000).build());
        Membership mship6m = membershipRepository.save(Membership.builder().name("6개월 정규반").duration(180).count(72).price(540000).build());
        membershipRepository.save(Membership.builder().name("무제한 프리패스").duration(30).count(999).price(200000).build());
        Membership mshipStaff = membershipRepository.save(Membership.builder().name("스태프 무제한").duration(36500).count(999999).price(0).build());
        log.info("멤버십 상품 5개 생성");

        // ── 스태프 무제한 멤버십 부여 ──
        ComplexMember[] allStaffs = {staff1, staff2, staff3, staff4, staff5, staff6};
        Map<Long, ComplexMemberMembership> staffMembershipMap = new HashMap<>();
        for (ComplexMember staff : allStaffs) {
            ComplexMemberMembership mm = complexMemberMembershipRepository.save(ComplexMemberMembership.builder()
                    .member(staff).membership(mshipStaff)
                    .startDate(today.minusDays(365)).expiryDate(LocalDate.of(2099, 12, 31))
                    .totalCount(999999).internal(true).build());
            staffMembershipMap.put(staff.getSeq(), mm);
        }

        // ── 회원 (강남점) ──
        Object[][] gangnamMembers = {
                {"박지민", "01011112222", "중급", "English", "여, 30대", "BL001", "블로그", "조현일"},
                {"최수현", "01033334444", "초급", "English", "남, 20대", "BL002", "지인소개", "조현일"},
                {"김태영", "01055556666", "고급", "English", "남, 40대", "BL003", "인스타그램", "조현일"},
                {"이서연", "01011110001", "중급", "English", "여, 20대", "BL004", "블로그", "조현일"},
                {"정민우", "01011110002", "초급", "English", "남, 30대", "BL005", "네이버 광고", "조현일"},
                {"한지윤", "01011110003", "중급", "English", "여, 40대", "BL006", "지인소개", "이민호"},
                {"오준서", "01011110004", "초급", "English", "남, 20대", "BL007", "인스타그램", "이민호"},
                {"신예은", "01011110005", "고급", "English", "여, 30대", "BL008", "구글 광고", "김수진"},
                {"류재현", "01011110006", "중급", "English", "남, 50대", "BL009", "카카오 광고", "김수진"},
                {"문가영", "01011110007", "초급", "English", "여, 20대", "BL010", "틱톡", "조현일"},
                {"배수지", "01011110008", "중상급", "English", "여, 30대", "BL011", "블로그", "이민호"},
                {"임시완", "01011110009", "중급", "English", "남, 30대", "BL012", "지인소개", "조현일"},
                {"조보아", "01011110010", "초급", "English", "여, 20대", "BL013", "인스타그램", "김수진"},
                {"나인우", "01011110011", "고급", "English", "남, 40대", "BL014", "네이버 광고", "조현일"},
                {"유인나", "01011110012", "중급", "English", "여, 30대", "BL015", "구글 광고", "이민호"},
                {"서강준", "01011110013", "초급", "English", "남, 20대", "BL016", "지인소개", "조현일"},
                {"전소니", "01011110014", "중급", "English", "여, 30대", "BL017", "블로그", "김수진"},
                {"이도현", "01011110015", "중상급", "English", "남, 20대", "BL018", "인스타그램", "조현일"},
        };

        List<ComplexMember> gMembers = new ArrayList<>();
        for (Object[] d : gangnamMembers) {
            ComplexMember m = complexMemberRepository.save(ComplexMember.builder()
                    .branch(gangnam).name((String) d[0]).phoneNumber((String) d[1])
                    .info((String) d[4]).chartNumber((String) d[5]).interviewer((String) d[7])
                    .build());
            m.setMetaData(ComplexMemberMetaData.builder()
                    .member(m).level((String) d[2]).language((String) d[3]).signupChannel((String) d[6]).build());
            gMembers.add(complexMemberRepository.save(m));
        }

        // ── 회원 (서초점) ──
        Object[][] seochoMembers = {
                {"김하은", "01022220001", "초급", "English", "여, 10대", "SC001", "블로그", "정예린"},
                {"이준호", "01022220002", "중급", "English", "남, 10대", "SC002", "지인소개", "정예린"},
                {"박소율", "01022220003", "초급", "English", "여, 10대", "SC003", "카카오 광고", "정예린"},
                {"최시우", "01022220004", "중급", "English", "남, 30대", "SC004", "인스타그램", "제임스 리"},
                {"장서윤", "01022220005", "초급", "English", "여, 20대", "SC005", "네이버 광고", "정예린"},
                {"윤도윤", "01022220006", "중급", "English", "남, 40대", "SC006", "지인소개", "제임스 리"},
                {"강하린", "01022220007", "고급", "English", "여, 30대", "SC007", "구글 광고", "제임스 리"},
                {"임지호", "01022220008", "초급", "English", "남, 20대", "SC008", "블로그", "정예린"},
        };

        List<ComplexMember> sMembers = new ArrayList<>();
        for (Object[] d : seochoMembers) {
            ComplexMember m = complexMemberRepository.save(ComplexMember.builder()
                    .branch(seocho).name((String) d[0]).phoneNumber((String) d[1])
                    .info((String) d[4]).chartNumber((String) d[5]).interviewer((String) d[7])
                    .build());
            m.setMetaData(ComplexMemberMetaData.builder()
                    .member(m).level((String) d[2]).language((String) d[3]).signupChannel((String) d[6]).build());
            sMembers.add(complexMemberRepository.save(m));
        }
        log.info("회원 {}명 생성 (강남 {}, 서초 {})", gMembers.size() + sMembers.size(), gMembers.size(), sMembers.size());

        // ── 멤버십 등록 & 수업 배정 ──
        Membership[] mships = {mship3m, mship3m, mship6m, mship3m, mship1m, mship3m, mship1m, mship6m, mship3m, mship3m,
                mship3m, mship6m, mship1m, mship3m, mship3m, mship1m, mship3m, mship6m};
        // 강남점 수업 배정: 회원별로 다른 수업
        ComplexClass[] gClassAssign = {c1, c1, c4, c3, c1, c3, c2, c4, c5, c2, c3, c5, c6, c7, c6, c2, c1, c4};
        int[] usedCounts = {20, 15, 40, 18, 8, 22, 5, 50, 25, 10, 16, 45, 7, 20, 19, 6, 14, 35};
        int[] dayOffsets = {60, 45, 120, 50, 15, 55, 10, 140, 65, 30, 40, 130, 12, 60, 50, 8, 35, 100};

        List<ComplexMemberMembership> gMemberships = new ArrayList<>();
        for (int i = 0; i < gMembers.size(); i++) {
            ComplexMemberMembership mm = complexMemberMembershipRepository.save(ComplexMemberMembership.builder()
                    .member(gMembers.get(i)).membership(mships[i])
                    .startDate(today.minusDays(dayOffsets[i])).expiryDate(today.minusDays(dayOffsets[i]).plusDays(mships[i].getDuration()))
                    .totalCount(mships[i].getCount()).usedCount(usedCounts[i]).build());
            gMemberships.add(mm);
            complexMemberClassMappingRepository.save(ComplexMemberClassMapping.builder()
                    .member(gMembers.get(i)).complexClass(gClassAssign[i]).build());
        }

        // 서초점 수업 배정
        ComplexClass[] sClassAssign = {c8, c8, c8, c9, c10, c9, c9, c10};
        Membership[] sMships = {mship3m, mship3m, mship1m, mship6m, mship3m, mship3m, mship6m, mship1m};
        int[] sUsedCounts = {12, 18, 6, 35, 15, 20, 40, 4};
        int[] sDayOffsets = {40, 55, 12, 110, 45, 50, 120, 8};

        List<ComplexMemberMembership> sMemberships = new ArrayList<>();
        for (int i = 0; i < sMembers.size(); i++) {
            ComplexMemberMembership mm = complexMemberMembershipRepository.save(ComplexMemberMembership.builder()
                    .member(sMembers.get(i)).membership(sMships[i])
                    .startDate(today.minusDays(sDayOffsets[i])).expiryDate(today.minusDays(sDayOffsets[i]).plusDays(sMships[i].getDuration()))
                    .totalCount(sMships[i].getCount()).usedCount(sUsedCounts[i]).build());
            sMemberships.add(mm);
            complexMemberClassMappingRepository.save(ComplexMemberClassMapping.builder()
                    .member(sMembers.get(i)).complexClass(sClassAssign[i]).build());
        }
        log.info("멤버십 등록 & 수업 배정 완료");

        // ── 출석 기록 (강남점 회원 - 최근 60일) ──
        Random rand = new Random(42);
        for (int i = 0; i < gMembers.size(); i++) {
            ComplexClass cls = gClassAssign[i];
            Set<Integer> classDays = parseClassDays(cls.getTimeSlot().getDaysOfWeek());
            int attendDays = Math.min(dayOffsets[i], 60);

            for (int d = 1; d <= attendDays; d++) {
                LocalDate date = today.minusDays(d);
                if (!classDays.contains(date.getDayOfWeek().getValue())) continue;

                AttendanceStatus status;
                double r = rand.nextDouble();
                if (r < 0.75) status = AttendanceStatus.출석;
                else if (r < 0.90) status = AttendanceStatus.결석;
                else status = AttendanceStatus.연기;

                complexMemberAttendanceRepository.save(ComplexMemberAttendance.builder()
                        .member(gMembers.get(i)).memberMembership(gMemberships.get(i)).complexClass(cls)
                        .attendanceDate(date).status(status)
                        .note(status == AttendanceStatus.결석 && rand.nextDouble() < 0.3 ? "개인 사정" : null)
                        .build());

                membershipActivityLogRepository.save(MembershipActivityLog.builder()
                        .member(gMembers.get(i)).membership(gMemberships.get(i)).complexClass(cls)
                        .activityDate(date).status(status)
                        .usedCountDelta(status == AttendanceStatus.출석 ? 1 : 0)
                        .build());
            }
        }

        // ── 출석 기록 (서초점 회원) ──
        for (int i = 0; i < sMembers.size(); i++) {
            ComplexClass cls = sClassAssign[i];
            Set<Integer> classDays = parseClassDays(cls.getTimeSlot().getDaysOfWeek());
            int attendDays = Math.min(sDayOffsets[i], 60);

            for (int d = 1; d <= attendDays; d++) {
                LocalDate date = today.minusDays(d);
                if (!classDays.contains(date.getDayOfWeek().getValue())) continue;

                AttendanceStatus status;
                double r = rand.nextDouble();
                if (r < 0.72) status = AttendanceStatus.출석;
                else if (r < 0.88) status = AttendanceStatus.결석;
                else status = AttendanceStatus.연기;

                complexMemberAttendanceRepository.save(ComplexMemberAttendance.builder()
                        .member(sMembers.get(i)).memberMembership(sMemberships.get(i)).complexClass(cls)
                        .attendanceDate(date).status(status).build());

                membershipActivityLogRepository.save(MembershipActivityLog.builder()
                        .member(sMembers.get(i)).membership(sMemberships.get(i)).complexClass(cls)
                        .activityDate(date).status(status)
                        .usedCountDelta(status == AttendanceStatus.출석 ? 1 : 0)
                        .build());
            }
        }
        log.info("회원 출석 기록 생성 완료 (최대 60일치)");

        // ── 스태프 출석 기록 (ComplexMemberAttendance 통합) ──
        ComplexMember[] gangnamStaffs = {staff1, staff2, staff3, staff4};
        ComplexClass[][] staffClasses = {{c1, c5}, {c2, c3}, {c4, c7}, {c6}};
        for (int s = 0; s < gangnamStaffs.length; s++) {
            for (ComplexClass cls : staffClasses[s]) {
                Set<Integer> classDays = parseClassDays(cls.getTimeSlot().getDaysOfWeek());
                for (int d = 1; d <= 60; d++) {
                    LocalDate date = today.minusDays(d);
                    if (!classDays.contains(date.getDayOfWeek().getValue())) continue;
                    AttendanceStatus status = rand.nextDouble() < 0.92
                            ? AttendanceStatus.출석 : AttendanceStatus.결석;
                    complexMemberAttendanceRepository.save(ComplexMemberAttendance.builder()
                            .member(gangnamStaffs[s]).memberMembership(staffMembershipMap.get(gangnamStaffs[s].getSeq()))
                            .complexClass(cls).attendanceDate(date).status(status).build());

                    membershipActivityLogRepository.save(MembershipActivityLog.builder()
                            .member(gangnamStaffs[s]).complexClass(cls)
                            .activityDate(date).status(status)
                            .usedCountDelta(0).build());
                }
            }
        }

        ComplexMember[] seochoStaffs = {staff5, staff6};
        ComplexClass[][] sStaffClasses = {{c8, c10}, {c9}};
        for (int s = 0; s < seochoStaffs.length; s++) {
            for (ComplexClass cls : sStaffClasses[s]) {
                Set<Integer> classDays = parseClassDays(cls.getTimeSlot().getDaysOfWeek());
                for (int d = 1; d <= 60; d++) {
                    LocalDate date = today.minusDays(d);
                    if (!classDays.contains(date.getDayOfWeek().getValue())) continue;
                    AttendanceStatus status = rand.nextDouble() < 0.90
                            ? AttendanceStatus.출석 : AttendanceStatus.결석;
                    complexMemberAttendanceRepository.save(ComplexMemberAttendance.builder()
                            .member(seochoStaffs[s]).memberMembership(staffMembershipMap.get(seochoStaffs[s].getSeq()))
                            .complexClass(cls).attendanceDate(date).status(status).build());

                    membershipActivityLogRepository.save(MembershipActivityLog.builder()
                            .member(seochoStaffs[s]).complexClass(cls)
                            .activityDate(date).status(status)
                            .usedCountDelta(0).build());
                }
            }
        }
        log.info("스태프 출석 기록 생성 완료 (6명, 60일치)");
    }

    private ComplexMember createStaff(Branch branch, String name, String phone) {
        ComplexMember m = complexMemberRepository.save(ComplexMember.builder()
                .branch(branch).name(name).phoneNumber(phone).build());
        m.setStaffInfo(ComplexStaffInfo.builder().member(m).build());
        return complexMemberRepository.save(m);
    }

    private Set<Integer> parseClassDays(String daysOfWeek) {
        Map<String, Integer> dayMap = Map.of(
                "월", 1, "화", 2, "수", 3, "목", 4, "금", 5, "토", 6, "일", 7);
        Set<Integer> result = new HashSet<>();
        for (String day : daysOfWeek.split(",")) {
            Integer val = dayMap.get(day.trim());
            if (val != null) result.add(val);
        }
        return result;
    }
}
