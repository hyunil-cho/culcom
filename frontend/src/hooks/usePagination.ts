'use client';

import { useState, useCallback } from 'react';

interface UsePaginationReturn {
  page: number;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
  onPageChange: (page: number) => void;
  resetPage: () => void;
  /** DataTable에 바로 spread 가능한 props */
  paginationProps: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function usePagination(onLoad?: (page: number) => void): UsePaginationReturn {
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const onPageChange = useCallback((p: number) => {
    setPage(p);
    onLoad?.(p);
  }, [onLoad]);

  const resetPage = useCallback(() => {
    setPage(0);
  }, []);

  return {
    page,
    totalPages,
    setTotalPages,
    onPageChange,
    resetPage,
    paginationProps: { page, totalPages, onPageChange },
  };
}
