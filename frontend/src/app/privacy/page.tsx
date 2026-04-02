import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 - 컬컴 점주협의회',
};

export default function PrivacyPage() {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif',
      lineHeight: 1.6, color: '#333', background: '#f5f5f5', padding: 20, minHeight: '100vh',
    }}>
      <div style={{
        maxWidth: 900, margin: '0 auto', background: 'white',
        padding: 40, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{ fontSize: '2rem', color: '#2c3e50', marginBottom: 20, paddingBottom: 15, borderBottom: '3px solid #3498db' }}>
          개인정보처리방침
        </h1>

        <div style={{ background: '#ecf0f1', padding: 20, borderRadius: 6, marginBottom: 30, fontSize: '0.95rem', color: '#555' }}>
          컬컴 점주협의회는 개인정보 보호법 제30조에 따라 정보주체(고객)의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리지침을 수립/공개합니다.
        </div>

        <Section title="1. 개인정보의 처리목적">
          <p>컬컴 점주협의회는 다음의 목적을 위하여 개인정보를 처리하고 있으며, 다음의 목적 이외의 용도로는 이용하지 않습니다.</p>
          <ul>
            <li>고객 가입의사 확인, 고객에 대한 서비스 제공에 따른 본인 식별/인증, 회원자격 유지/관리, 물품 또는 서비스 공급에 따른 금액 결제, 물품 또는 서비스의 공급/배송 등</li>
          </ul>
        </Section>

        <Section title="2. 개인정보의 처리 및 보유기간">
          <p>① 컬컴 점주협의회는 정보주체로부터 개인정보를 수집할 때 동의받은 개인정보 보유/이용기간 또는 법령에 따른 개인정보 보유/이용기간 내에서 개인정보를 처리/보유합니다.</p>
          <p>② 구체적인 개인정보 처리 및 보유 기간은 다음과 같습니다.</p>
          <ul>
            <li><strong>고객 가입 및 관리:</strong> 서비스 이용계약 또는 회원가입 해지시까지, 다만 채권/채무관계 잔존시에는 해당 채권/채무관계 정산시까지</li>
            <li><strong>전자상거래에서의 계약/청약철회, 대금결제, 재화 등 공급기록:</strong> 5년</li>
          </ul>
        </Section>

        <Section title="3. 개인정보의 제3자 제공">
          <p>컬컴 점주협의회는 정보주체의 별도 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조에 해당하는 경우 외에는 개인정보를 제3자에게 제공하지 않습니다.</p>
          <p>다만, 이용자가 특정 지점에 상담 또는 가입을 신청한 경우, 원활한 서비스 제공을 위해 아래와 같이 정보를 제공합니다.</p>
          <ul>
            <li><strong>제공받는 자:</strong> 이용자가 지원한 컬컴 각 지점(가맹점)</li>
            <li><strong>제공 목적:</strong> 지점별 방문 상담 예약, 서비스 가입 절차 진행 및 계약 이행</li>
            <li><strong>제공 근거:</strong> 정보주체의 상담·가입 신청에 따른 동의</li>
            <li><strong>제공 항목:</strong> 성명, 연락처, 상담 신청 내용 등(가입 후에는 가입 정보)</li>
            <li><strong>보유 및 이용기간:</strong> 지점의 서비스 제공 완료 시 혹은 고객의 파기 요청 시까지</li>
          </ul>
        </Section>

        <Section title="4. 개인정보처리의 위탁 및 외부 플랫폼 이용">
          <p>① 컬컴 점주협의회는 원활한 서비스 제공을 위해 다음과 같이 외부 플랫폼을 이용하고 있습니다.</p>
          <ul>
            <li><strong>위탁 대상자(수탁자):</strong> Meta Platforms, Inc. (페이스북/인스타그램), TikTok Pte. Ltd.</li>
            <li><strong>메타, 틱톡 위탁 업무 내용:</strong> 리드 광고를 통한 잠재고객 정보 수집 및 광고 성과 분석</li>
            <li><strong>처리되는 개인정보:</strong> 이용자가 광고를 통해 직접 입력한 정보</li>
          </ul>
          <p>② 컬컴 점주협의회는 통합 전산 시스템 운영 및 데이터 관리를 위해 다음과 같이 위탁하고 있습니다.</p>
          <ul>
            <li><strong>위탁 대상자(수탁자):</strong> 통합 전산 서버 운영 업체(AWS, Cafe24 등)</li>
            <li><strong>위탁 업무 내용:</strong> 회원 정보 및 상담 이력 등 개인정보의 저장·관리</li>
            <li><strong>위탁되는 개인정보 항목:</strong> 성명, 연락처, 가입 및 상담 관련 정보</li>
          </ul>
        </Section>

        <Section title="5. 정보주체와 법정대리인의 권리/의무 및 행사방법">
          <p>정보주체는 컬컴 점주협의회에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
          <ol>
            <li>개인정보 열람요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제요구</li>
            <li>처리정지 요구</li>
          </ol>
        </Section>

        <Section title="6. 처리하는 개인정보 항목">
          <p>컬컴 점주협의회는 다음의 개인정보 항목을 처리하고 있습니다.</p>
          <ul>
            <li><strong>가입 전:</strong> 성명, 전화번호 (메타 리드 광고 및 카카오 자동 지원 링크, 틱톡 등을 통해 수집)</li>
            <li><strong>가입 후:</strong> 성명, 생년월일, 주소, 전화번호, 성별, 이메일주소, 결제정보
              <br /><span style={{ color: '#e74c3c' }}>※ 신용카드번호 및 계좌번호는 별도로 저장하지 않습니다.</span>
            </li>
          </ul>
        </Section>

        <Section title="7. 개인정보의 파기">
          <p>① 컬컴 점주협의회는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다. 혹은 고객의 이메일로 정식 파기 요청이 들어올 경우, 인지 이후 파기를 원칙으로 합니다.</p>
          <p>② 컬컴 점주협의회는 다음의 방법으로 개인정보를 파기합니다.</p>
          <ul>
            <li><strong>전자적 파일:</strong> 파일 삭제, 디스크 포맷</li>
            <li><strong>종이 문서:</strong> 분쇄하거나 소각</li>
          </ul>
        </Section>

        <Section title="8. 개인정보의 안전성 확보조치">
          <p>컬컴 점주협의회는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
          <ul>
            <li><strong>관리적 조치:</strong> 내부관리계획 수립/시행, 직원/종업원 등에 대한 정기적 교육</li>
            <li><strong>기술적 조치:</strong> 개인정보처리시스템(또는 개인정보가 저장된 컴퓨터)의 비밀번호 설정 등 접근권한 관리, 백신소프트웨어 등 보안프로그램 설치, 개인정보가 저장된 파일의 암호화</li>
            <li><strong>물리적 조치:</strong> 개인정보가 저장/보관된 장소의 시건, 출입통제 등</li>
          </ul>
        </Section>

        <Section title="9. 개인정보 자동 수집 장치의 설치 운영 및 그 거부에 관한 사항">
          <p>① 컬컴 점주협의회는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 &apos;쿠키(cookie)&apos;를 필요한 경우 사용할 수도 있습니다.</p>
          <p>② 이용자는 웹 브라우저의 옵션 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만, 쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수 있습니다.</p>
        </Section>

        <Section title="10. 개인정보 보호책임자">
          <p>컬컴 점주협의회는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
          <div style={{ background: '#e3f2fd', padding: 20, borderRadius: 6, margin: '20px 0' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#34495e', marginBottom: 10 }}>▶ 개인정보 보호책임자 (사업주 또는 대표자)</h3>
            <p><strong>성명:</strong> 박근홍</p>
            <p><strong>직책:</strong> 대표</p>
            <p><strong>연락처:</strong> 010-6679-5754</p>
            <p><strong>이메일:</strong> baobab2637@gmail.com</p>
          </div>
        </Section>

        <Section title="11. 개인정보의 국외 이전">
          <p>협의회는 광고 플랫폼 이용 과정에서 개인정보가 국외에 위치한 서버에서 처리될 수 있습니다.</p>
          <ul>
            <li><strong>이전되는 개인정보 항목:</strong> 성명, 휴대전화번호 등 광고 응답 시 이용자가 입력한 정보</li>
            <li><strong>이전 국가:</strong> 미국</li>
            <li><strong>이전 시점 및 방법:</strong> 이용자가 광고에 응답하는 즉시 네트워크를 통해 전송</li>
            <li><strong>이전받는 자:</strong> Meta Platforms, Inc.</li>
            <li><strong>이전 목적:</strong> 리드 광고 운영 및 광고 성과 분석</li>
            <li><strong>보유 및 이용기간:</strong> 목적 달성 시까지 각 플랫폼의 정책 및 협의회의 개인정보 보유기간에 따름</li>
          </ul>
        </Section>

        <Section title="12. 개인정보 처리방침 변경">
          <div style={{ background: '#fff3cd', padding: 15, borderRadius: 4, borderLeft: '4px solid #ffc107', margin: '20px 0' }}>
            <p><strong>이 개인정보 처리방침은 2025. 12. 23부터 적용됩니다.</strong></p>
          </div>
        </Section>

        <div style={{ marginTop: 50, paddingTop: 20, borderTop: '1px solid #ddd', textAlign: 'center', color: '#777', fontSize: '0.9rem' }}>
          <p>&copy; 2025 컬컴 점주협의회. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: '1.4rem', color: '#2c3e50', marginTop: 35, marginBottom: 15, paddingLeft: 12, borderLeft: '4px solid #3498db' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
