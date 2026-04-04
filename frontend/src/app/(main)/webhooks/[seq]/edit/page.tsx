'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { webhookApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ROUTES } from '@/lib/routes';
import WebhookForm, {
  emptyWebhookForm, validateWebhookForm,
  fieldMappingsToJson, jsonToFieldMappings,
  authConfigToJson, jsonToAuthConfig,
  type WebhookFormData,
} from '../../WebhookForm';
import { useResultModal } from '@/hooks/useResultModal';

export default function WebhookEditPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const [form, setForm] = useState<WebhookFormData>(emptyWebhookForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.WEBHOOKS });
  const [deleting, setDeleting] = useState(false);

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
        authConfig: jsonToAuthConfig(w.authConfig),
        isActive: w.isActive,
      });
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateWebhookForm(form);
    if (error) { alert(error); return; }
    await run(webhookApi.update(seq, {
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
    }), '웹훅이 수정되었습니다.');
  };

  return (
    <>
      <WebhookForm form={form} onChange={setForm} onSubmit={handleSubmit}
        isEdit backHref={ROUTES.WEBHOOKS} submitLabel="수정" />
      {deleting && (
        <ConfirmModal
          title="삭제 확인"
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            setDeleting(false);
            await run(webhookApi.delete(seq), '웹훅이 삭제되었습니다.');
          }}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          이 웹훅을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      {modal}
    </>
  );
}
