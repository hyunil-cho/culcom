'use client';

import { useId, useState } from 'react';
import type { ConsentItem } from '@/lib/api';

export default function ConsentItemBlock({
  item, agreed, onToggle,
}: {
  item: ConsentItem;
  agreed: boolean;
  onToggle: (v: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  return (
    <div style={{
      ...wrapperStyle,
      borderColor: agreed ? '#bbf7d0' : '#e5e7eb',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={contentId}
        style={toggleBtnStyle}
      >
        <span style={titleStyle}>
          {item.title}
          {item.required && <span style={requiredBadgeStyle}>(필수)</span>}
        </span>
        <span style={toggleLabelStyle}>{expanded ? '접기' : '펼치기'}</span>
      </button>

      {expanded && (
        <div id={contentId} role="region" style={contentStyle}>
          {item.content}
        </div>
      )}

      <label style={{
        ...checkLabelStyle,
        background: agreed ? '#f0fdf4' : '#fff',
      }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => onToggle(e.target.checked)}
          style={checkboxStyle}
        />
        <span style={{
          ...checkTextStyle,
          color: agreed ? '#15803d' : '#6b7280',
        }}>
          동의합니다
        </span>
      </label>
    </div>
  );
}

const wrapperStyle: React.CSSProperties = {
  marginBottom: 10,
  borderWidth: '1.5px',
  borderStyle: 'solid',
  borderRadius: 8,
  overflow: 'hidden',
  transition: 'border-color 0.2s',
};

const toggleBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: '#f9fafb',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  color: '#374151',
};

const requiredBadgeStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '0.7rem',
  marginLeft: 4,
};

const toggleLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#9ca3af',
};

const contentStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: '#fff',
  maxHeight: 200,
  overflowY: 'auto',
  fontSize: '0.8rem',
  color: '#4b5563',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  borderTop: '1px solid #e5e7eb',
};

const checkLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  cursor: 'pointer',
  borderTop: '1px solid #f3f4f6',
};

const checkboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  accentColor: '#10b981',
};

const checkTextStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 600,
};
