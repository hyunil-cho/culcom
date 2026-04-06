import { ReactNode } from 'react';
import { SurveyTemplate, SurveySection } from '@/lib/api';
import SurveyProgressBar from './SurveyProgressBar';
import s from '../fill/page.module.css';

interface Props {
  template: SurveyTemplate;
  sections: SurveySection[];
  currentPage: number;
  headerExtra?: ReactNode;
  footerText: string;
  children: ReactNode;
}

export default function SurveyShell({ template, sections, currentPage, headerExtra, footerText, children }: Props) {
  return (
    <div className={s.body}>
      <div className={s.wrapper}>
        <div className={s.header}>
          <div className={s.templateTitle}>{template.name}</div>
          {template.description && <div className={s.notice}>{template.description}</div>}
          {headerExtra}
        </div>

        <SurveyProgressBar sections={sections} currentPage={currentPage} />

        {children}

        <div className={s.footer}>{footerText}</div>
      </div>
    </div>
  );
}
