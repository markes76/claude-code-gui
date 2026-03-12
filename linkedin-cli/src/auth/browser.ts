import { chromium, type BrowserContext } from 'playwright';
import { BROWSER_PROFILE_DIR, ensureConfigDir } from '../utils/config.js';
import { extractLinkedInCookies } from './cookies.js';
import type { LinkedInCookies } from './cookies.js';

const LINKEDIN_HOME = 'https://www.linkedin.com/feed/';

/**
 * Opens a persistent Chrome window and waits for the user to log in to LinkedIn.
 * Returns the extracted session cookies once the feed page is detected.
 */
export async function launchLoginFlow(): Promise<LinkedInCookies> {
  ensureConfigDir();

  const context = await chromium.launchPersistentContext(BROWSER_PROFILE_DIR, {
    headless: false,
    channel: 'chrome',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    viewport: null,
  });

  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

  console.log('\n  Browser opened. Please log in to LinkedIn in the browser window.\n  Waiting for you to reach the feed page...\n');

  // Poll until the user lands on the feed or a known post-login page
  await page.waitForURL(
    (url) =>
      url.href.includes('/feed') ||
      url.href.includes('/mynetwork') ||
      url.href.includes('/in/'),
    { timeout: 300_000 },
  );

  const cookies = await extractLinkedInCookies(context);
  await context.close();
  return cookies;
}

/**
 * Opens a persistent context (reuses existing browser profile) without
 * launching a visible window — used only for cookie extraction during login.
 * Exported for testing / future background use.
 */
export async function openPersistentContext(): Promise<BrowserContext> {
  ensureConfigDir();
  return chromium.launchPersistentContext(BROWSER_PROFILE_DIR, {
    headless: false,
    channel: 'chrome',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    viewport: null,
  });
}
