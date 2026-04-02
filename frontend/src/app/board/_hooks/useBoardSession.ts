'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface BoardSession {
  isLoggedIn: boolean;
  memberName: string;
  memberSeq: number | null;
}

const INITIAL: BoardSession = { isLoggedIn: false, memberName: '', memberSeq: null };

/**
 * 보드 세션 정보를 가져오는 훅.
 * requireAuth가 true이면 미로그인 시 /board로 리다이렉트.
 */
export function useBoardSession(requireAuth = false) {
  const router = useRouter();
  const [session, setSession] = useState<BoardSession>(INITIAL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/public/board/session', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const d = data.data || data;
        const info: BoardSession = {
          isLoggedIn: d.isLoggedIn || d.loggedIn || false,
          memberName: d.memberName || '',
          memberSeq: d.memberSeq ?? null,
        };
        setSession(info);
        setLoaded(true);
        if (requireAuth && !info.isLoggedIn) {
          router.push('/board');
        }
      })
      .catch(() => {
        setLoaded(true);
        if (requireAuth) {
          router.push('/board');
        }
      });
  }, [requireAuth, router]);

  return { session, loaded };
}
