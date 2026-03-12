import { voyagerGet } from '../api/client.js';

export interface Paging {
  count: number;
  start: number;
  total: number;
}

export interface PaginatedResponse<T> {
  elements: T[];
  paging: Paging;
}

export interface PaginateOptions {
  limit?: number;
  delayMs?: number;
  extraParams?: Record<string, string | number | boolean>;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic Voyager paginator using cursor-based start/count parameters.
 * Fetches pages until `limit` items have been collected or no more pages exist.
 */
export async function paginate<T>(
  endpoint: string,
  options: PaginateOptions = {},
): Promise<T[]> {
  const { limit = 50, delayMs = 1200, extraParams = {} } = options;
  const pageSize = Math.min(limit, 50);
  const results: T[] = [];
  let start = 0;

  while (results.length < limit) {
    const remaining = limit - results.length;
    const count = Math.min(pageSize, remaining);

    const response = await voyagerGet<PaginatedResponse<T>>(endpoint, {
      params: { start, count, ...extraParams },
      delayMs,
    });

    const items = response.elements ?? [];
    results.push(...items);

    const total = response.paging?.total ?? 0;
    start += items.length;

    if (items.length < count || results.length >= total) break;
  }

  return results.slice(0, limit);
}
