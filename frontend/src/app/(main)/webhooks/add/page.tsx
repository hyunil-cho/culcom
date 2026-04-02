'use client';

import { useState } from 'react';
import { webhookApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import WebhookForm, { emptyWebhookForm, validateWebhookForm, fieldMappingsToJson, type WebhookFormData } from '../WebhookForm';
import ResultModal from '@/components/ui/ResultModal';

export default function WebhookAddPage() {
  const [form, setForm] = useState<WebhookFormData>(emptyWebhookForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async () => {
    const error = validateWebhookForm(form);
    if (error) { alert(error); return; }
    const res = await webhookApi.create({
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
      setResult({ success: true, message: '웹훅이 등록되었습니다.' });
    }
  };

  return (
    <>
      <WebhookForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.WEBHOOKS} submitLabel="등록" />
      {result && <ResultModal success={result.success} message={result.message} redirectPath={ROUTES.WEBHOOKS} />}
    </>
  );
}
