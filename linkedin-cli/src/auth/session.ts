import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { SESSION_FILE, ensureConfigDir } from '../utils/config.js';

export interface Session {
  liAt: string;
  jsessionId: string;
  savedAt: string;
}

export function readSession(): Session | null {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    const raw = readFileSync(SESSION_FILE, 'utf-8');
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function writeSession(session: Session): void {
  ensureConfigDir();
  writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), {
    mode: 0o600,
    encoding: 'utf-8',
  });
}

export function clearSession(): void {
  if (existsSync(SESSION_FILE)) {
    unlinkSync(SESSION_FILE);
  }
}

export function hasSession(): boolean {
  return existsSync(SESSION_FILE) && readSession() !== null;
}
