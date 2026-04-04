'use client';

import Link from 'next/link';
import { Button, LinkButton } from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import { Input, NumberInput, Select, Textarea, Checkbox } from '@/components/ui/FormInput';

const HTTP_METHODS = ['POST', 'PUT', 'PATCH', 'GET', 'DELETE'] as const;
const CONTENT_TYPES = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'] as const;
const AUTH_TYPES = [
  { value: '', label: '없음' },
  { value: 'API_KEY', label: 'API Key (헤더)' },
  { value: 'QUERY_PARAM', label: 'API Key (쿼리 파라미터)' },
  { value: 'HMAC_SHA256', label: 'HMAC-SHA256 서명 검증' },
  { value: 'BASIC', label: 'Basic Auth' },
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

export interface AuthConfig {
  key?: string;
  header_name?: string;
  param_name?: string;
  secret?: string;
  verify_token?: string;
  username?: string;
  password?: string;
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
  authConfig: AuthConfig;
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
  authConfig: {},
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

/** authConfig JSON 문자열 → AuthConfig 객체 */
export function jsonToAuthConfig(json: string | null): AuthConfig {
  return json ? JSON.parse(json) : {};
}

/** AuthConfig 객체 → JSON 문자열 (DB 저장용) */
export function authConfigToJson(config: AuthConfig): string {
  return JSON.stringify(config);
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

function AuthConfigFields({
  authType,
  authConfig,
  onChange,
}: {
  authType: string;
  authConfig: AuthConfig;
  onChange: (config: AuthConfig) => void;
}) {
  const update = (key: keyof AuthConfig, value: string) =>
    onChange({ ...authConfig, [key]: value });

  if (!authType) return null;

  switch (authType) {
    case 'API_KEY':
      return (
        <>
          <FormField label="헤더 이름" hint="기본값: x-api-key">
            <Input placeholder="x-api-key" value={authConfig.header_name ?? ''}
              onChange={(e) => update('header_name', e.target.value)} />
          </FormField>
          <FormField label="API Key 값" required>
            <Input placeholder="API Key" value={authConfig.key ?? ''}
              onChange={(e) => update('key', e.target.value)} />
          </FormField>
        </>
      );
    case 'QUERY_PARAM':
      return (
        <>
          <FormField label="파라미터 이름" hint="기본값: api_key">
            <Input placeholder="api_key" value={authConfig.param_name ?? ''}
              onChange={(e) => update('param_name', e.target.value)} />
          </FormField>
          <FormField label="API Key 값" required>
            <Input placeholder="API Key" value={authConfig.key ?? ''}
              onChange={(e) => update('key', e.target.value)} />
          </FormField>
        </>
      );
    case 'HMAC_SHA256':
      return (
        <>
          <FormField label="App Secret" required hint="HMAC 서명 검증에 사용할 시크릿">
            <Input placeholder="App Secret" value={authConfig.secret ?? ''}
              onChange={(e) => update('secret', e.target.value)} />
          </FormField>
          <FormField label="서명 헤더" hint="기본값: X-Hub-Signature-256">
            <Input placeholder="X-Hub-Signature-256" value={authConfig.header_name ?? ''}
              onChange={(e) => update('header_name', e.target.value)} />
          </FormField>
          <FormField label="Verify Token" hint="구독 검증(GET handshake)에 사용할 토큰">
            <Input placeholder="Verify Token" value={authConfig.verify_token ?? ''}
              onChange={(e) => update('verify_token', e.target.value)} />
          </FormField>
        </>
      );
    case 'BASIC':
      return (
        <>
          <FormField label="사용자명" required>
            <Input placeholder="Username" value={authConfig.username ?? ''}
              onChange={(e) => update('username', e.target.value)} />
          </FormField>
          <FormField label="비밀번호" required>
            <Input type="password" placeholder="Password" value={authConfig.password ?? ''}
              onChange={(e) => update('password', e.target.value)} />
          </FormField>
        </>
      );
    default:
      return null;
  }
}

export default function WebhookForm({
  form,
  onChange,
  onSubmit,
  isEdit,
  backHref,
  submitLabel,
}: {
  form: WebhookFormData;
  onChange: (form: WebhookFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
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
        {isEdit && (
          <div className="action-group" style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onSubmit}>{submitLabel}</Button>
            <LinkButton href={backHref} variant="secondary">취소</LinkButton>
          </div>
        )}
      </div>

      {/* 기본 정보 */}
      <div className="content-card">
        <div className="form-header"><h2>기본 정보</h2></div>
        <div className="form-body">
          <FormField label="웹훅 이름" required>
            <Input placeholder="예: 카카오싱크 회원 유입" value={form.name}
              onChange={(e) => set('name', e.target.value)} required />
          </FormField>
          <FormField label="소스 이름" required hint="데이터를 보내는 외부 서비스">
            <Input placeholder="예: kakao, naver, custom" value={form.sourceName}
              onChange={(e) => set('sourceName', e.target.value)} required />
          </FormField>
          <FormField label="소스 설명">
            <Input placeholder="소스에 대한 간단한 설명" value={form.sourceDescription}
              onChange={(e) => set('sourceDescription', e.target.value)} />
          </FormField>
          <FormField label="활성 상태">
            <Checkbox label="활성화" checked={form.isActive}
              onChange={(e) => set('isActive', (e.target as HTMLInputElement).checked)} />
          </FormField>
        </div>
      </div>

      {/* 요청 인터페이스 */}
      <div className="content-card" style={{ marginTop: 16 }}>
        <div className="form-header"><h2>요청 (Request) 인터페이스</h2></div>
        <div className="form-body">
          <FormField label="HTTP 메서드" required>
            <Select value={form.httpMethod}
              onChange={(e) => set('httpMethod', e.target.value)}>
              {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
          </FormField>
          {form.httpMethod !== 'GET' && (
            <FormField label="Content-Type">
              <Select value={form.requestContentType}
                onChange={(e) => set('requestContentType', e.target.value)}>
                {CONTENT_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
              </Select>
            </FormField>
          )}
          <FormField label="인증 방식">
            <Select value={form.authType}
              onChange={(e) => {
                set('authType', e.target.value);
                set('authConfig', {});
              }}>
              {AUTH_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </Select>
          </FormField>
          <AuthConfigFields
            authType={form.authType}
            authConfig={form.authConfig}
            onChange={(config) => set('authConfig', config)}
          />
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
                  <Input
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
            <NumberInput value={form.responseStatusCode}
              onChange={(e) => set('responseStatusCode', Number(e.target.value))} min={100} max={599} />
          </FormField>
          <FormField label="응답 Content-Type">
            <Select value={form.responseContentType}
              onChange={(e) => set('responseContentType', e.target.value)}>
              {CONTENT_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
            </Select>
          </FormField>
          <FormField label="응답 Body 템플릿" hint="웹훅 호출 후 소스에 반환할 응답">
            <Textarea style={{ height: 100, fontFamily: 'monospace', fontSize: '0.85rem' }}
              placeholder={'{"success": true, "message": "received"}'}
              value={form.responseBodyTemplate} onChange={(e) => set('responseBodyTemplate', e.target.value)} />
          </FormField>
        </div>
      </div>

      {!isEdit && (
        <div className="form-actions">
          <button className="btn-primary-large" onClick={onSubmit}>{submitLabel}</button>
          <Link href={backHref} className="btn-secondary-large">취소</Link>
        </div>
      )}
    </>
  );
}
