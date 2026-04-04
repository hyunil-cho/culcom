'use client';

import { useState } from 'react';
import { webhookApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import WebhookForm, { emptyWebhookForm, validateWebhookForm, fieldMappingsToJson, authConfigToJson, type WebhookFormData } from '../WebhookForm';
import { useResultModal } from '@/hooks/useResultModal';

export default function WebhookAddPage() {
  const [form, setForm] = useState<WebhookFormData>(emptyWebhookForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.WEBHOOKS });

  const handleSubmit = async () => {
    const error = validateWebhookForm(form);
    if (error) { alert(error); return; }
    await run(webhookApi.create({
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
      authConfig: form.authType ? authConfigToJson(form.authConfig) : undefined,
      isActive: form.isActive,
    }), '웹훅이 등록되었습니다.');
  };

  return (
    <>
      <WebhookForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.WEBHOOKS} submitLabel="등록" />
      {modal}
    </>
  );
}
