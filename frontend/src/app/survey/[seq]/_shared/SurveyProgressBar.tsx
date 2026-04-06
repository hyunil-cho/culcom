import { SurveySection } from '@/lib/api';
import s from '../fill/page.module.css';

interface Props {
  sections: SurveySection[];
  currentPage: number;
}

export default function SurveyProgressBar({ sections, currentPage }: Props) {
  if (sections.length === 0) return null;

  return (
    <div className={s.progressBar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
        <div className={currentPage === 0 ? s.stepDotActive : s.stepDotDone}>
          {currentPage > 0 ? '\u2713' : 1}
        </div>
        <span className={currentPage === 0 ? s.stepLabelActive : s.stepLabel}>고객 기본 정보</span>
      </div>
      {sections.map((sec, i) => (
        <div key={sec.seq} style={{ display: 'contents' }}>
          <div className={s.stepLine} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <div className={i + 1 === currentPage ? s.stepDotActive : i + 1 < currentPage ? s.stepDotDone : s.stepDot}>
              {i + 1 < currentPage ? '\u2713' : i + 2}
            </div>
            <span className={i + 1 === currentPage ? s.stepLabelActive : s.stepLabel}>{sec.title}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
