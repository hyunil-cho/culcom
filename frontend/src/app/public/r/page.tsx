import { headers } from 'next/headers';
import Image from 'next/image';
import NavBarClient from './NavBarClient';
import GalleryClient from './GalleryClient';
import ProgramTabsClient from './ProgramTabsClient';
import FaqClient from './FaqClient';
import FadeUpObserver from './FadeUpObserver';

// 기존 시스템의 카카오 회원가입/로그인 진입점.
// KakaoOAuthController.login(@GetMapping("/login")) 이 kakao 인가 URL 로 302 redirect.
// next.config.js 의 rewrites 로 /api/* → backend:8081 매핑되어 있음.
const KAKAO_LOGIN_URL_DESKTOP = '/api/public/kakao/login?state=1';
const KAKAO_LOGIN_URL_MOBILE = 'https://pf-link.kakao.com/qr/_kXQxlX/pages/_xlM?query=state%3D3';

const PAIN_POINTS: { img: string; emoji: string; html: React.ReactNode; delay: string }[] = [
  { img: '/images/r/pain-1.png', emoji: '😰', delay: '0.05s', html: <>영어 왕초보, 어디서부터 시작해야 할지 <strong>막막하신가요?</strong></> },
  { img: '/images/r/pain-2.png', emoji: '😔', delay: '0.1s', html: <>혼자 공부해도 실력이 늘지 않아 <strong>좌절하고 계신가요?</strong></> },
  { img: '/images/r/pain-3.png', emoji: '😨', delay: '0.15s', html: <>외국인 만나면 자연스럽게 대화하는 것이 <strong>두려우신가요?</strong></> },
  { img: '/images/r/pain-4.png', emoji: '😴', delay: '0.2s', html: <>영어는 해야 하는데 <strong>재미가 없었던 적</strong> 있으신가요?</> },
  { img: '/images/r/pain-5.png', emoji: '😤', delay: '0.25s', html: <>실제 대화에서 쓸 표현을 잘 찾지 못해 <strong>답답하신가요?</strong></> },
  { img: '/images/r/pain-6.png', emoji: '📉', delay: '0.3s', html: <>영어 안 쓰다 보니 <strong>감이 사라지고 있지는 않으신가요?</strong></> },
];

const WHY: { img: string; alt: string; tag: string; title: string; desc: string; wide?: boolean; delay: string }[] = [
  { img: '/images/r/why-1.png', alt: 'AI 튜터', tag: 'AI Tutor', title: 'AI와 함께, 멈추지 않는 성장', desc: '수업 시간이 끝나도 AI 튜터가 내 손안에서 24시간 피드백을 줘요.', delay: '0.05s' },
  { img: '/images/r/why-2.png', alt: '소규모 대화', tag: 'Speaking Only', title: '밀도 높은 대화의 즐거움', desc: '5~7명, 딱 좋은 사람들과 눈을 맞추며 진짜 대화를 나눕니다.', delay: '0.1s' },
  { img: '/images/r/why-3.png', alt: '문화 이벤트', tag: 'Culture Event', title: '여권 없이 떠나는 문화 여행', desc: '파티, 이벤트, 영미권 문화 체험까지. 서울 한복판에서 세계를 만나요.', delay: '0.15s' },
  { img: '/images/r/why-4.png', alt: '프리미엄 라운지', tag: '24H Open', title: '언제든 열려 있는 나만의 몰입 공간', desc: '24시간 개방되는 프리미엄 라운지에서 당신의 성장에 집중하세요.', delay: '0.2s' },
  { img: '/images/r/why-5.png', alt: '무제한 음료', tag: 'Unlimited Free', title: '무제한으로 즐기는 여유', desc: "향긋한 커피와 갓 구운 빵, 시원한 맥주까지. 모든 게 '무제한 무료'니까요.", delay: '0.25s' },
  { img: '/images/r/why-6.png', alt: '커뮤니티', tag: 'Community', title: '결이 같은 사람들의 커뮤니티', desc: '나를 닮은 사람들과 만나 나누는 대화, 그 속에서 쌓이는 든든한 우정.', delay: '0.3s' },
  { img: '/images/r/why-7.png', alt: '다양한 활동', tag: 'Lifestyle', title: '영어 그 이상의 즐거움', desc: '북클럽부터 클라이밍, 러닝까지. 취향을 공유하며 영어로 노는 즐거움을 경험하세요.', wide: true, delay: '0.35s' },
];

const COMPARE_ROWS: { item: string; school: React.ReactNode; eut: React.ReactNode }[] = [
  { item: '말하기 비율', school: <>강의·문법 위주 <span className="badge bad">낮음</span></>, eut: <>100% 대화 중심 <span className="badge good">높음</span></> },
  { item: '수업 인원', school: <>대규모 클래스</>, eut: <>소규모 테이블 <span className="badge good">맞춤형</span></> },
  { item: '분위기', school: <>딱딱한 학습 환경</>, eut: <>편안한 커뮤니티 <span className="badge good">즐거움</span></> },
  { item: '네트워킹', school: <>없음</>, eut: <>이벤트 + 문화 교류 <span className="badge good">풍부함</span></> },
  { item: '실전 회화', school: <>교재 중심</>, eut: <>실전 주제 대화 <span className="badge good">실용적</span></> },
  { item: '비용', school: <>비쌈</>, eut: <>합리적 <span className="badge good">가성비</span></> },
];

interface Review {
  img: string;
  name: string;
  job: string;
  tag: string;
  text: string;
}
const REVIEWS: Review[] = [
  { img: '/images/r/rv-1.png', name: '김지은', job: '마케터 · 29세', tag: '자신감 향상', text: '"마케팅 일을 하면서 영어 자료를 자주 접하는데, 막상 말하려고 하면 너무 위축됐어요. E-uT는 분위기 자체가 편해서 틀려도 부담이 없었고, 어느 순간부터 자연스럽게 말이 나오기 시작했어요."' },
  { img: '/images/r/rv-2.png', name: '박성훈', job: '개발자 · 33세', tag: '업무 영어', text: '"외국 클라이언트 회의에서 말이 안 나오더라고요. E-uT에서 연습했던 표현들이 회사 회의에서 그대로 나올 때 진짜 신기했습니다. 영어 회의가 이제 준비하면 할 수 있는 영역이 됐어요."' },
  { img: '/images/r/rv-3.png', name: '이수민', job: '대학생 · 24세', tag: '외국인 친구', text: '"외국인 친구를 사귀고 싶었는데 말이 안 되니까 다가가기 어렵더라고요. E-uT는 억지로 친해지는 느낌이 아니라 편하게 어울리게 됐어요. 이제는 공부보다 사람 만나러 오는 느낌이 더 커요."' },
  { img: '/images/r/rv-4.png', name: '최민재', job: '영업직 · 31세', tag: '이직 성공', text: '"이직 준비하면서 영어 면접이 제일 걱정이었어요. E-uT에서 실제처럼 말하는 연습을 하면서 점점 문장이 자연스러워졌고, 결국 면접에서 합격까지 이어졌습니다."' },
  { img: '/images/r/rv-5.png', name: '정유진', job: '간호사 · 28세', tag: '워킹홀리데이', text: '"워킹홀리데이를 가고 싶었는데 영어가 너무 부족해서 고민만 했어요. E-uT에서 일단 말해보는 환경 덕분에 점점 익숙해졌고, 외국에서 생활할 수 있겠다는 자신감이 생겼습니다."' },
  { img: '/images/r/rv-6.png', name: '김도현', job: '자영업 · 41세', tag: '자기계발', text: '"영어를 취미로 시작했는데 혼자서는 꾸준히 하기 어렵더라고요. E-uT는 공간도 편하고 사람들도 좋아서 자연스럽게 계속 오게 됩니다. 이 나이에 새로운 자극을 받는다는 게 굉장히 의미 있어요."' },
  { img: '/images/r/rv-7.png', name: '한지훈', job: '취준생 · 27세', tag: '면접 준비', text: '"취업 준비하면서 영어 점수는 있는데 막상 말은 못 하는 상태였어요. E-uT에서 계속 말하는 연습을 하다 보니 문장 만드는 속도가 빨라졌고, 이제는 영어가 부담이 아닌 영역이 됐습니다."' },
  { img: '/images/r/rv-8.png', name: '윤서연', job: '디자이너 · 30세', tag: '자신감 향상', text: '"틀릴까봐 말을 아예 안 하게 되더라고요. E-uT에서는 틀리는 게 당연한 분위기라 부담 없이 말할 수 있었어요. 지금은 먼저 말을 꺼내는 저를 보고 스스로도 놀라고 있습니다."' },
  { img: '/images/r/rv-9.png', name: '이경민', job: '공무원 · 35세', tag: '실력 유지', text: '"시간이 지나니까 감이 떨어지는 게 느껴졌어요. E-uT는 자연스럽게 영어를 계속 쓰게 되는 환경이라 억지로 공부하지 않아도 유지됩니다. \'잃어버리지 않고 계속 가져간다\'는 게 가장 만족스러워요."' },
  { img: '/images/r/rv-10.png', name: '조현우', job: '트레이너 · 32세', tag: '외국인 응대', text: '"헬스장에 외국인 회원이 많아지는데 기본 설명조차 못 해서 답답했어요. E-uT에서 실제처럼 계속 말하다 보니 자연스럽게 문장이 나옵니다. 이건 공부가 아니라 진짜 현장에서 쓰는 영어였습니다."' },
  { img: '/images/r/rv-11.png', name: '김하늘', job: '승무원 준비생 · 26세', tag: '해외 취업', text: '"승무원 면접 준비하면서 혼자 연습하면 비슷한 문장만 반복됐어요. E-uT에서 다양한 사람들과 말하다 보니 예상 못 한 질문에도 대응하는 연습이 됐습니다. \'시험용 영어\'가 아닌 \'실전 영어\'를 만든 느낌이에요."' },
  { img: '/images/r/rv-12.png', name: '오세진', job: '스타트업 대표 · 38세', tag: '글로벌 네트워킹', text: '"해외 파트너들과 직접 소통하고 싶었어요. E-uT는 다양한 직군 사람들이 모이다 보니 대화 자체가 흥미롭습니다. 영어뿐 아니라 새로운 관점과 인사이트도 얻고 있어요."' },
  { img: '/images/r/rv-13.png', name: '배지수', job: '대학생 · 22세', tag: '해외여행', text: '"여행 가서 영어로 말해보고 싶었는데 상황이 오면 말이 안 나올까봐 걱정이 많았어요. E-uT에서는 실제처럼 대화하는 환경이라 여행 상황을 자연스럽게 연습할 수 있었어요. 다음 여행이 기대됩니다!"' },
  { img: '/images/r/rv-14.png', name: '강태호', job: '회사원 · 45세', tag: '늦깎이 시작', text: '"이 나이에 영어를 시작해도 될까 고민이 많았어요. 근데 E-uT는 다양한 연령대가 있어서 생각보다 훨씬 편하게 적응했습니다. 지금은 영어보다 \'시작했다는 것\' 자체가 더 의미 있게 느껴져요."' },
  { img: '/images/r/rv-15.png', name: '이다은', job: '콘텐츠 크리에이터 · 27세', tag: '글로벌 감각', text: '"영어를 단순히 공부가 아니라 문화적으로 이해하고 싶었어요. E-uT에서는 외국인들과 자연스럽게 어울리면서 그들의 생각과 문화를 직접 느낄 수 있습니다. 시야 자체가 넓어진 느낌이에요."' },
  { img: '/images/r/rv-16.png', name: '박준호', job: '은행원 · 36세', tag: '커리어 업그레이드', text: '"이직을 고민하면서 영어 회화 능력이 필요하다는 걸 더 크게 느꼈어요. E-uT에서 꾸준히 말하는 연습을 하다 보니 문장을 만드는 속도가 빨라지고 직접 표현할 수 있게 됐습니다."' },
  { img: '/images/r/rv-17.png', name: '정미영', job: '주부 · 52세', tag: '이민 준비', text: '"해외에서 살아보고 싶다는 생각이 있었는데 영어가 가장 큰 장벽이었어요. E-uT는 분위기가 편안해서 천천히 적응할 수 있었고, 지금은 영어가 두려운 게 아니라 기대되는 부분으로 바뀌었습니다."' },
];

function ReviewCard({ r, priority }: { r: Review; priority?: boolean }) {
  return (
    <div className="rv-card">
      <div className="rv-top">
        <Image
          src={r.img}
          alt={r.name}
          width={52}
          height={52}
          className="rv-img"
          loading={priority ? undefined : 'lazy'}
          sizes="52px"
        />
        <div className="rv-info">
          <p className="rv-name">{r.name}</p>
          <p className="rv-job">{r.job}</p>
          <span className="rv-tag">{r.tag}</span>
        </div>
      </div>
      <p className="rv-text">{r.text}</p>
    </div>
  );
}

export default function LandingPage() {
  const ua = headers().get('user-agent') ?? '';
  const KAKAO_LOGIN_URL = /Mobile|Android|iPhone|iPad|iPod/i.test(ua)
    ? KAKAO_LOGIN_URL_MOBILE
    : KAKAO_LOGIN_URL_DESKTOP;

  return (
    <div className="eut-landing">
      <FadeUpObserver />
      <NavBarClient kakaoLoginHref={KAKAO_LOGIN_URL} />

      {/* ===== HERO ===== */}
      <section id="hero">
        <div className="hero-video-wrap">
          <div className="hero-overlay" />
          <Image
            src="/images/r/hero-bg.png"
            alt="E-uT 영어회화 커뮤니티"
            fill
            priority
            sizes="100vw"
            className="hero-fallback"
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
          />
        </div>
        <div className="hero-content fade-in">
          <p className="hero-eyebrow">English conversation community</p>
          <h1 className="hero-title">
            영어로 만나, 서로를 알아가는 공간
            <br />
            <span
              className="accent"
              style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.62em', letterSpacing: '0.01em' }}
            >
              Experience, you together
            </span>
          </h1>
          <p className="hero-sub">
            말하는 연습, 함께하는 성장
            <br />
            대화 중심 영어회화 커뮤니티
          </p>
          <a href={KAKAO_LOGIN_URL} className="btn btn-primary hero-btn">
            스터디 시간 알아보기 →
          </a>
        </div>
        <a href="#pain-points" className="scroll-arrow" aria-label="아래로 스크롤">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </a>
      </section>

      {/* ===== PAIN POINTS ===== */}
      <section id="pain-points" className="section bg-light">
        <div className="container">
          <div className="section-header fade-up">
            <p className="section-label">야너두..?</p>
            <h2 className="section-title">
              혹시 <span className="accent">이런 경험</span> 있으신가요?
            </h2>
            <p className="section-desc">많은 분들이 똑같은 이유로 영어를 포기하거나 시작조차 못 합니다.</p>
          </div>
          <div className="pain-photo-grid">
            {PAIN_POINTS.map(p => (
              <div className="pain-photo-card fade-up" key={p.img} style={{ ['--delay' as string]: p.delay }}>
                <div className="pain-photo-img" style={{ position: 'relative', height: 160 }}>
                  <Image src={p.img} alt="" fill sizes="(max-width:768px) 130px, 160px" style={{ objectFit: 'cover', objectPosition: 'center top' }} loading="lazy" />
                </div>
                <div className="pain-photo-text">
                  <span className="pain-emoji">{p.emoji}</span>
                  <p>{p.html}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pain-bottom fade-up">
            <p className="pain-cta-text">
              걱정하지 마세요. <strong>E-uT</strong>가 함께합니다.
            </p>
          </div>
        </div>
      </section>

      {/* ===== WHY E-uT ===== */}
      <section id="why-eut" className="section bg-white">
        <div className="container">
          <div className="section-header fade-up">
            <p className="section-label">E-uT의 교육 철학</p>
            <h2 className="section-title">
              E-uT는 <span className="accent">다릅니다</span>
            </h2>
            <p className="section-desc">
              우리는 <strong>수업보다 대화 경험</strong>을 더 중요하게 생각합니다.
              <br />
              직접 말하고, 듣고, 반응하는 것이 진짜 영어 실력입니다.
            </p>
          </div>
          <div className="why-photo-grid">
            {WHY.map(w => (
              <div
                key={w.img}
                className={`why-photo-card fade-up${w.wide ? ' why-photo-card--wide' : ''}`}
                style={{ ['--delay' as string]: w.delay }}
              >
                <div className="why-photo-img">
                  <Image
                    src={w.img}
                    alt={w.alt}
                    fill
                    sizes="(max-width:768px) 100vw, 570px"
                    style={{ objectFit: 'cover', objectPosition: 'center center' }}
                    loading="lazy"
                  />
                  <span className="why-photo-tag">{w.tag}</span>
                </div>
                <div className="why-photo-body">
                  <h3>{w.title}</h3>
                  <p>{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMPARE TABLE + CTA ===== */}
      <section id="compare" className="section bg-light">
        <div className="container">
          <div className="section-header fade-up">
            <p className="section-label">무엇이 다른가요?</p>
            <h2 className="section-title">
              <span className="accent">&#39;영어학원&#39;</span>과 <span className="accent">&#39;E-uT 스터디&#39;</span>,
              <br />
              무엇이 다른가요?
            </h2>
          </div>
          <div className="compare-table-wrap fade-up">
            <table className="compare-table">
              <thead>
                <tr>
                  <th className="th-item">비교 항목</th>
                  <th className="th-school">영어학원</th>
                  <th className="th-eut">E-uT 스터디 ✅</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(r => (
                  <tr key={r.item}>
                    <td>{r.item}</td>
                    <td className="col-school">{r.school}</td>
                    <td className="col-eut">{r.eut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="compare-cta fade-up">
            <a href={KAKAO_LOGIN_URL} className="btn btn-primary">
              무료 체험 신청하기 →
            </a>
          </div>
        </div>
      </section>

      {/* ===== GALLERY ===== */}
      <section id="gallery" className="section bg-white">
        <div className="container">
          <div className="section-header fade-up">
            <p className="section-label">공간 &amp; 커뮤니티</p>
            <h2 className="section-title">
              E-uT의 <span className="accent">공간과 사람들</span>
            </h2>
            <p className="section-desc">직접 와서 보세요. 영어가 재미있어지는 공간이 있습니다.</p>
          </div>
          <GalleryClient />
        </div>
      </section>

      {/* ===== PROGRAMS ===== */}
      <section id="programs" className="section bg-dark">
        <div className="container">
          <div className="section-header fade-up">
            <p className="section-label light">커리큘럼</p>
            <h2 className="section-title light">
              나에게 맞는 <span className="accent">레벨</span>을 찾아보세요
            </h2>
            <p className="section-desc light">초보부터 프리토킹까지, 단계별로 설계된 E-uT 프로그램입니다.</p>
          </div>
          <ProgramTabsClient />
        </div>
      </section>

      {/* ===== REVIEWS TICKER ===== */}
      <section id="reviews" className="section bg-light">
        <div className="container">
          <div className="section-header fade-up">
            <p className="section-label">Real Stories</p>
            <h2 className="section-title">
              E-uT를 경험한 <span className="accent">분들의 후기</span>
            </h2>
          </div>
        </div>
        <div className="ticker-outer">
          <div className="ticker-track" id="ticker-track">
            {/* seamless loop 를 위해 2번 반복 */}
            {REVIEWS.map((r, i) => (
              <ReviewCard key={`a-${r.img}`} r={r} priority={i < 3} />
            ))}
            {REVIEWS.map(r => (
              <ReviewCard key={`b-${r.img}`} r={r} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section id="cta-final" className="section cta-section">
        <div className="cta-overlay" />
        <div className="container cta-content fade-up">
          <p className="cta-eyebrow">지금이 바로 그 순간</p>
          <h2 className="cta-title">
            지금 바로
            <br />
            <span>영어 대화를 시작하세요</span>
          </h2>
          <p className="cta-desc">
            첫 번째 스터디는 <strong>무료 체험</strong>으로 참여하실 수 있어요.
            <br />
            부담 없이 와서, 직접 느껴보세요.
          </p>
          <a href={KAKAO_LOGIN_URL} className="btn btn-white">
            무료 체험 신청하기 →
          </a>
          <p className="cta-note">* 별도 준비물 없이 몸만 오시면 됩니다.</p>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="section bg-white">
        <div className="container">
          <div className="section-header fade-up">
            <p className="section-label">FAQ</p>
            <h2 className="section-title">
              자주 묻는 <span className="accent">질문</span>
            </h2>
          </div>
          <FaqClient />
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer id="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <a href="#" className="nav-logo footer-logo">
              E-uT<span className="logo-dot">.</span>
            </a>
            <p>영어로 만나, 서로를 알아가는 공간</p>
            <p>수업보다 대화 경험을 중요하게 생각하는 영어회화 커뮤니티</p>
          </div>
          <div className="footer-links">
            <a href="#why-eut">소개</a>
            <a href="#programs">프로그램</a>
            <a href="#gallery">공간</a>
            <a href="#reviews">후기</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-social">
            <a href="#" aria-label="인스타그램">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a href="#" aria-label="카카오톡">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.69 2 11.22c0 2.86 1.82 5.38 4.6 6.9l-1.17 4.37 5.1-3.36c.47.07.96.1 1.47.1 5.52 0 10-3.69 10-8.22S17.52 3 12 3z" />
              </svg>
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 E-uT (English uTopia). All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
