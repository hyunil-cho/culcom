'use client';

import s from './LinkShared.module.css';

interface Props {
  title: string;
  description: string;
}

export default function UnavailableNotice({ title, description }: Props) {
  return (
    <div className={s.unavailableBox}>
      <div className={s.unavailableIcon}>!</div>
      <div className={s.unavailableTitle}>{title}</div>
      <div className={s.unavailableDesc}>{description}</div>
    </div>
  );
}
