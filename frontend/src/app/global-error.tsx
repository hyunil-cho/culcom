'use client';

import ErrorPage from '@/components/ErrorPage';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <ErrorPage
          code="500"
          title="오류가 발생했습니다"
          message="요청을 처리하는 중 문제가 발생했습니다."
          detail={error.message}
        />
      </body>
    </html>
  );
}
