'use client';

import Link from 'next/link';
import FormField from '@/components/ui/FormField';

const HTTP_METHODS = ['POST', 'PUT', 'PATCH', 'GET', 'DELETE'] as const;
const CONTENT_TYPES = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'] as const;
const AUTH_TYPES = [
  { value: '', label: '없음' },
  { value: 'API_KEY', label: 'API Key (헤더)' },
  { value: 'QUERY_PARAM', label: 'API Key (쿼리 파라미터)' },
] as const;

/** Customer 테이블의 매핑 가능한 필드 목록 */
const CUSTOMER_FIELDS: readonly { key: string; label: string; required?: boolean }[] = [
  { key: 'name', label: '이름', required: true },
  { key: 'phoneNumber', label: '전화번호', required: true },
  { key: 'comment', label: '비고' },
  { key: 'commercialName', label: '광고명' },
  { key: 'adSource', label: '유입경로' },
];

export interface FieldMappingEntry {
  customerField: string;
  sourceParam: string;
}

export interface WebhookFormData {
  name: string;
  sourceName: string;
  sourceDescription: string;
  httpMethod: string;
  requestContentType: string;
  requestHeaders: string;
  requestBodySchema: string;
  responseStatusCode: number;
  responseContentType: string;
  responseBodyTemplate: string;
  fieldMappings: FieldMappingEntry[];
  authType: string;
  authKey: string;
  isActive: boolean;
}

export const emptyWebhookForm: WebhookFormData = {
  name: '',
  sourceName: '',
  sourceDescription: '',
  httpMethod: 'POST',
  requestContentType: 'application/json',
  requestHeaders: '',
  requestBodySchema: '',
  responseStatusCode: 200,
  responseContentType: 'application/json',
  responseBodyTemplate: '{"success": true, "message": "received"}',
  fieldMappings: CUSTOMER_FIELDS.map(f => ({ customerField: f.key, sourceParam: '' })),
  authType: '',
  authKey: '',
  isActive: false,
};

/** fieldMappings 배열 → JSON 문자열 (DB 저장용) */
export function fieldMappingsToJson(mappings: FieldMappingEntry[]): string {
  const obj: Record<string, string> = {};
  mappings.forEach(m => { if (m.sourceParam.trim()) obj[m.customerField] = m.sourceParam.trim(); });
  return JSON.stringify(obj);
}

/** JSON 문자열 → fieldMappings 배열 */
export function jsonToFieldMappings(json: string | null): FieldMappingEntry[] {
  const parsed: Record<string, string> = json ? JSON.parse(json) : {};
  return CUSTOMER_FIELDS.map(f => ({
    customerField: f.key,
    sourceParam: parsed[f.key] ?? '',
  }));
}

export function validateWebhookForm(form: WebhookFormData): string | null {
  if (!form.name.trim()) return '웹훅 이름을 입력하세요.';
  if (!form.sourceName.trim()) return '소스 이름을 입력하세요.';
  const mapped = form.fieldMappings.filter(m => m.sourceParam.trim());
  if (mapped.length === 0) return '최소 하나의 필드 매핑을 입력하세요.';
  const requiredFields = CUSTOMER_FIELDS.filter(f => f.required);
  for (const rf of requiredFields) {
    const entry = form.fieldMappings.find(m => m.customerField === rf.key);
    if (!entry?.sourceParam.trim()) return `"${rf.label}" 필드는 필수 매핑입니다.`;
  }
  return null;
}

export default function WebhookForm({
  form,
  onChange,
  onSubmit,
  backHref,
  submitLabel,
}: {
  form: WebhookFormData;
  onChange: (form: WebhookFormData) => void;
  onSubmit: () => void;
  backHref: string;
  submitLabel: string;
}) {
  const set = <K extends keyof WebhookFormData>(field: K, value: WebhookFormData[K]) =>
    onChange({ ...form, [field]: value });

  const updateMapping = (customerField: string, sourceParam: string) => {
    onChange({
      ...form,
      fieldMappings: form.fieldMappings.map(m =>
        m.customerField === customerField ? { ...m, sourceParam } : m
      ),
    });
  };

  const paramHint = form.httpMethod === 'GET' ? '쿼리 파라미터명' : 'Body 필드명 (JSON path)';

  return (
    <>
      <div className="detail-actions">
        <Link href={backHref} className="btn-back">← 목록으로</Link>
      </div>

      {/* 기본 정보 */}
      <div className="content-card">
        <div className="form-header"><h2>기본 정보</h2></div>
        <div className="form-body">
          <FormField label="웹훅 이름" required>
            <input className="form-input" placeholder="예: 카카오싱크 회원 유입" value={form.name}
              onChange={(e) => set('name', e.target.value)} required />
          </FormField>
          <FormField label="소스 이름" required hint="데이터를 보내는 외부 서비스">
            <input className="form-input" placeholder="예: kakao, naver, custom" value={form.sourceName}
              onChange={(e) => set('sourceName', e.target.value)} required />
          </FormField>
          <FormField label="소스 설명">
            <input className="form-input" placeholder="소스에 대한 간단한 설명" value={form.sourceDescription}
              onChange={(e) => set('sourceDescription', e.target.value)} />
          </FormField>
          <FormField label="활성 상태">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)} />
              활성화
            </label>
          </FormField>
        </div>
      </div>

      {/* 요청 인터페이스 */}
      <div className="content-card" style={{ marginTop: 16 }}>
        <div className="form-header"><h2>요청 (Request) 인터페이스</h2></div>
        <div className="form-body">
          <FormField label="HTTP 메서드" required>
            <select className="form-input" value={form.httpMethod}
              onChange={(e) => set('httpMethod', e.target.value)}>
              {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </FormField>
          {form.httpMethod !== 'GET' && (
            <FormField label="Content-Type">
              <select className="form-input" value={form.requestContentType}
                onChange={(e) => set('requestContentType', e.target.value)}>
                {CONTENT_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            </FormField>
          )}
          <FormField label="인증 방식">
            <select className="form-input" value={form.authType}
              onChange={(e) => set('authType', e.target.value)}>
              {AUTH_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </FormField>
          {form.authType && (
            <FormField label="인증 키" required hint="소스에서 보내야 하는 인증 값">
              <input className="form-input" placeholder="API Key 값" value={form.authKey}
                onChange={(e) => set('authKey', e.target.value)} />
            </FormField>
          )}
        </div>
      </div>

      {/* 필드 매핑 */}
      <div className="content-card" style={{ marginTop: 16 }}>
        <div className="form-header">
          <h2>필드 매핑 (소스 → Customer)</h2>
        </div>
        <div className="form-body">
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
            소스가 보내는 {form.httpMethod === 'GET' ? '쿼리 파라미터' : 'Body 필드'}를 Customer 필드에 매핑합니다.
            <strong style={{ color: '#e53e3e' }}> *</strong> 표시된 필드는 필수입니다.
          </p>
          <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 40px 1fr',
              background: '#f3f4f6', padding: '10px 16px', gap: 8,
              fontSize: '0.82rem', fontWeight: 700, color: '#444',
            }}>
              <span>Customer 필드</span>
              <span></span>
              <span>소스 {paramHint}</span>
            </div>
            {form.fieldMappings.map(m => {
              const field = CUSTOMER_FIELDS.find(f => f.key === m.customerField);
              return (
                <div key={m.customerField} style={{
                  display: 'grid', gridTemplateColumns: '1fr 40px 1fr',
                  padding: '8px 16px', gap: 8, alignItems: 'center',
                  borderTop: '1px solid #f0f0f0',
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#333' }}>
                    {field?.label ?? m.customerField}
                    {field?.required && <span style={{ color: '#e53e3e' }}> *</span>}
                    <span style={{ color: '#aaa', fontSize: '0.78rem', marginLeft: 4 }}>({m.customerField})</span>
                  </span>
                  <span style={{ textAlign: 'center', color: '#aaa' }}>←</span>
                  <input
                    className="form-input"
                    style={{ margin: 0, padding: '6px 10px', fontSize: '0.88rem' }}
                    placeholder={`소스의 ${paramHint}`}
                    value={m.sourceParam}
                    onChange={(e) => updateMapping(m.customerField, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 응답 인터페이스 */}
      <div className="content-card" style={{ marginTop: 16 }}>
        <div className="form-header"><h2>응답 (Response) 인터페이스</h2></div>
        <div className="form-body">
          <FormField label="응답 상태 코드">
            <input type="number" className="form-input" value={form.responseStatusCode}
              onChange={(e) => set('responseStatusCode', Number(e.target.value))} min={100} max={599} />
          </FormField>
          <FormField label="응답 Content-Type">
            <select className="form-input" value={form.responseContentType}
              onChange={(e) => set('responseContentType', e.target.value)}>
              {CONTENT_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
            </select>
          </FormField>
          <FormField label="응답 Body 템플릿" hint="웹훅 호출 후 소스에 반환할 응답">
            <textarea className="form-input" style={{ height: 100, fontFamily: 'monospace', fontSize: '0.85rem' }}
              placeholder={'{"success": true, "message": "received"}'}
              value={form.responseBodyTemplate} onChange={(e) => set('responseBodyTemplate', e.target.value)} />
          </FormField>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-primary-large" onClick={onSubmit}>{submitLabel}</button>
        <Link href={backHref} className="btn-secondary-large">취소</Link>
      </div>
    </>
  );
}
