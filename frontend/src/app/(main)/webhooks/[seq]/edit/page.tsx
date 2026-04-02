'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { webhookApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import WebhookForm, {
  emptyWebhookForm, validateWebhookForm,
  fieldMappingsToJson, jsonToFieldMappings,
  type WebhookFormData,
} from '../../WebhookForm';
import ResultModal from '@/components/ui/ResultModal';

export default function WebhookEditPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const [form, setForm] = useState<WebhookFormData>(emptyWebhookForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    webhookApi.get(seq).then(res => {
      const w = res.data;
      setForm({
        name: w.name,
        sourceName: w.sourceName,
        sourceDescription: w.sourceDescription ?? '',
        httpMethod: w.httpMethod,
        requestContentType: w.requestContentType,
        requestHeaders: w.requestHeaders ?? '',
        requestBodySchema: w.requestBodySchema ?? '',
        responseStatusCode: w.responseStatusCode,
        responseContentType: w.responseContentType,
        responseBodyTemplate: w.responseBodyTemplate ?? '',
        fieldMappings: jsonToFieldMappings(w.fieldMapping),
        authType: w.authType ?? '',
        authKey: w.authKey ?? '',
        isActive: w.isActive,
      });
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateWebhookForm(form);
    if (error) { alert(error); return; }
    const res = await webhookApi.update(seq, {
      name: form.name,
      sourceName: form.sourceName,
      sourceDescription: form.sourceDescription || undefined,
      httpMethod: form.httpMethod,
      requestContentType: form.requestContentType,
      requestHeaders: form.requestHeaders || undefined,
      requestBodySchema: form.requestBodySchema || undefined,
      responseStatusCode: form.responseStatusCode,
      responseContentType: form.responseContentType,
      responseBodyTemplate: form.responseBodyTemplate || undefined,
      fieldMapping: fieldMappingsToJson(form.fieldMappings),
      authType: form.authType || undefined,
      authKey: form.authKey || undefined,
      isActive: form.isActive,
    });
    if (res.success) {
      setResult({ success: true, message: '웹훅이 수정되었습니다.' });
    }
  };

  return (
    <>
      <WebhookForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.WEBHOOKS} submitLabel="수정" />
      {result && <ResultModal success={result.success} message={result.message} redirectPath={ROUTES.WEBHOOKS} />}
    </>
  );
}
