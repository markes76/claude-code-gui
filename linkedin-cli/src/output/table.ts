import Table from 'cli-table3';
import { theme } from './colors.js';

export interface TableRow {
  [key: string]: string | number | boolean;
}

export function createTable(headers: string[]): InstanceType<typeof Table> {
  return new Table({
    head: headers.map((h) => theme.primary(h)),
    style: { border: ['gray'], head: [] },
    wordWrap: true,
  });
}

export function printTable(headers: string[], rows: Array<Array<string | number>>): void {
  if (rows.length === 0) {
    console.log(theme.muted('  No results found.'));
    return;
  }
  const table = createTable(headers);
  for (const row of rows) {
    table.push(row.map(String));
  }
  console.log(table.toString());
}

export function printKeyValue(pairs: Record<string, string | number | undefined | null>): void {
  const table = new Table({
    style: { border: ['gray'], head: [] },
  });
  for (const [key, value] of Object.entries(pairs)) {
    if (value !== undefined && value !== null && value !== '') {
      table.push({ [theme.label(key)]: String(value) });
    }
  }
  console.log(table.toString());
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}
