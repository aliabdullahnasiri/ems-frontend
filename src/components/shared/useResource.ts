import { useEffect, useState } from 'react';
import { request } from '../../api/client';

export function useResource<T>(path: string, revision = 0, paginated = false) {
  const [state, set] = useState<{
    path: string;
    revision: number;
    data?: T;
    error?: string;
  }>();
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    async function load() {
      const options = { signal: controller.signal };
      if (!paginated) return request<T>(path, options);
      const rows: unknown[] = [];
      for (;;) {
        const response = await request<unknown[] | { data: unknown[] }>(
          path + "?limit=100&offset=" + rows.length,
          options,
        );
        const page = Array.isArray(response) ? response : response.data;
        rows.push(...page);
        if (page.length < 100) return rows as T;
      }
    }
    load()
      .then((data) => {
        if (!controller.signal.aborted) set({ path, revision, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          set({ path, revision, error: String(error.message) });
      });
    return () => controller.abort();
  }, [path, revision, paginated]);
  return state?.path === path && state.revision === revision
    ? state
    : undefined;
}
