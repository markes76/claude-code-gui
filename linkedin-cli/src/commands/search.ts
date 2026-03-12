import { Command } from 'commander';
import { paginate } from '../utils/pagination.js';
import { ENDPOINTS } from '../api/voyager.js';
import type { VoyagerSearchResult, VoyagerSearchResponse } from '../api/types.js';
import { handleError } from '../utils/errors.js';
import { theme } from '../output/colors.js';
import { printJson } from '../output/json.js';
import { printTable, truncate } from '../output/table.js';

type SearchType = 'people' | 'companies' | 'jobs' | 'posts';

const ENTITY_TYPE_MAP: Record<SearchType, string> = {
  people: 'PEOPLE',
  companies: 'COMPANIES',
  jobs: 'JOBS',
  posts: 'CONTENT',
};

async function runSearch(
  query: string,
  type: SearchType,
  limit: number,
): Promise<VoyagerSearchResult[]> {
  const { voyagerGet } = await import('../api/client.js');
  const data = await voyagerGet<VoyagerSearchResponse>(ENDPOINTS.search, {
    params: {
      q: 'all',
      keywords: query,
      origin: 'GLOBAL_SEARCH_HEADER',
      entityType: ENTITY_TYPE_MAP[type],
      start: 0,
      count: Math.min(limit, 50),
    },
  });

  const results: VoyagerSearchResult[] = [];
  for (const el of data.elements ?? []) {
    for (const r of el.results ?? []) {
      results.push(r);
      if (results.length >= limit) break;
    }
    if (results.length >= limit) break;
  }
  return results;
}

export function registerSearch(program: Command): void {
  const searchCmd = program
    .command('search')
    .description('Search LinkedIn for people, companies, jobs, or posts');

  for (const type of ['people', 'companies', 'jobs', 'posts'] as SearchType[]) {
    searchCmd
      .command(`${type} <query>`)
      .description(`Search ${type} on LinkedIn`)
      .option('--limit <n>', 'Limit results', '10')
      .option('--json', 'Output as JSON')
      .action(async (query: string, opts: { limit: string; json?: boolean }) => {
        try {
          const limit = parseInt(opts.limit, 10);
          const results = await runSearch(query, type, limit);

          if (opts.json) {
            printJson(results);
            return;
          }

          console.log(`\n  ${theme.label(`Search: ${type}`)} ${theme.muted(`"${query}" — ${results.length} results`)}\n`);

          if (results.length === 0) {
            console.log(theme.muted('  No results found.'));
            return;
          }

          printTable(
            ['Title / Name', 'Subtitle', 'URL'],
            results.map((r) => [
              truncate(r.title?.text ?? '', 35),
              truncate(r.primarySubtitle?.text ?? '', 40),
              r.navigationUrl
                ? truncate(r.navigationUrl, 50)
                : r.publicIdentifier
                  ? `linkedin.com/in/${r.publicIdentifier}`
                  : '—',
            ]),
          );
          console.log();
        } catch (err) {
          handleError(err);
        }
      });
  }
}
