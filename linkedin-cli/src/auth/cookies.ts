import type { BrowserContext } from 'playwright';

export interface LinkedInCookies {
  liAt: string | null;
  jsessionId: string | null;
}

export async function extractLinkedInCookies(context: BrowserContext): Promise<LinkedInCookies> {
  const cookies = await context.cookies('https://www.linkedin.com');
  const liAt = cookies.find((c) => c.name === 'li_at')?.value ?? null;
  // JSESSIONID may be stored with quotes; strip them
  const raw = cookies.find((c) => c.name === 'JSESSIONID')?.value ?? null;
  const jsessionId = raw ? raw.replace(/^"|"$/g, '') : null;
  return { liAt, jsessionId };
}

export function buildCookieHeader(liAt: string, jsessionId: string): string {
  return `li_at=${liAt}; JSESSIONID="${jsessionId}"`;
}
