import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

export const CONFIG_DIR = join(homedir(), '.config', 'linkedin-cli');
export const SESSION_FILE = join(CONFIG_DIR, 'session.json');
export const BROWSER_PROFILE_DIR = join(CONFIG_DIR, 'browser-profile');

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  if (!existsSync(BROWSER_PROFILE_DIR)) {
    mkdirSync(BROWSER_PROFILE_DIR, { recursive: true, mode: 0o700 });
  }
}
