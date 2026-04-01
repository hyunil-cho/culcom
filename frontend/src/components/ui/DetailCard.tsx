'use client';

import { ReactNode } from 'react';

interface DetailField {
  label: string;
  value: ReactNode;
  preWrap?: boolean;
}

interface DetailCardProps {
  title: string;
  fields: DetailField[];
}

export default function DetailCard({ title, fields }: DetailCardProps) {
  return (
    <div className="content-card">
      <div className="detail-header">
        <h2>{title}</h2>
      </div>
      <div className="detail-body">
        {fields.map((f, i) => (
          <div className="detail-row" key={i}>
            <div className="detail-label">{f.label}</div>
            <div className="detail-value" style={f.preWrap ? { whiteSpace: 'pre-wrap' } : undefined}>
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
