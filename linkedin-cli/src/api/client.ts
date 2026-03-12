import { readSession } from '../auth/session.js';
import { buildCookieHeader } from '../auth/cookies.js';
import { LinkedInError, AuthError, RateLimitError } from '../utils/errors.js';
import { sleep } from '../utils/pagination.js';

const DEFAULT_DELAY_MS = 1000;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export interface RequestOptions {
  params?: Record<string, string | number | boolean>;
  delayMs?: number;
}

function buildHeaders(liAt: string, jsessionId: string): Record<string, string> {
  return {
    Cookie: buildCookieHeader(liAt, jsessionId),
    'csrf-token': jsessionId,
    'x-li-lang': 'en_US',
    'x-restli-protocol-version': '2.0.0',
    'x-li-track':
      '{"clientVersion":"1.13.17073","mpVersion":"1.13.17073","osName":"web","timezoneOffset":-7,"timezone":"America/Los_Angeles","deviceFormFactor":"DESKTOP","mpName":"voyager-web"}',
    'Accept': 'application/vnd.linkedin.normalized+json+2.1',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': USER_AGENT,
    Referer: 'https://www.linkedin.com/',
    Origin: 'https://www.linkedin.com',
  };
}

function buildUrl(url: string, params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    qs.set(k, String(v));
  }
  return `${url}?${qs.toString()}`;
}

export async function voyagerGet<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const session = readSession();
  if (!session) {
    throw new AuthError('No session found. Run: linkedin login');
  }

  const { params, delayMs = DEFAULT_DELAY_MS } = options;
  const url = buildUrl(endpoint, params);
  const headers = buildHeaders(session.liAt, session.jsessionId);

  await sleep(delayMs);

  const response = await fetch(url, { headers });

  if (response.status === 401) {
    throw new AuthError('Session expired. Run: linkedin login');
  }
  if (response.status === 403) {
    throw new RateLimitError('Access forbidden (403). LinkedIn may have blocked this request.');
  }
  if (response.status === 429) {
    throw new RateLimitError('Rate limited (429). Please wait before making more requests.');
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new LinkedInError(
      `LinkedIn API error ${response.status}: ${response.statusText}${body ? `\n${body.slice(0, 200)}` : ''}`,
    );
  }

  return response.json() as Promise<T>;
}
