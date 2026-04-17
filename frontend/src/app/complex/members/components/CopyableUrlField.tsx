'use client';

import { useState } from 'react';
import s from './LinkShared.module.css';

interface Props {
  label: string;
  url: string;
  hint?: string;
}

export default function CopyableUrlField({ label, url, hint }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={s.fieldGroup}>
      <label className={s.fieldLabel}>{label}</label>
      <div className={s.urlRow}>
        <input
          readOnly
          value={url}
          className={s.urlInput}
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button onClick={handleCopy} className={s.copyBtn}>
          {copied ? '복사됨!' : '복사'}
        </button>
      </div>
      {hint && <p className={s.urlHint}>{hint}</p>}
    </div>
  );
}
