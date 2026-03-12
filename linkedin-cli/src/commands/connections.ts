import { Command } from 'commander';
import { voyagerGet } from '../api/client.js';
import { paginate } from '../utils/pagination.js';
import { ENDPOINTS } from '../api/voyager.js';
import type { VoyagerConnection, VoyagerConnectionsResponse } from '../api/types.js';
import { handleError } from '../utils/errors.js';
import { theme } from '../output/colors.js';
import { printJson } from '../output/json.js';
import { printTable, formatDate, truncate } from '../output/table.js';

export function registerConnections(program: Command): void {
  program
    .command('connections')
    .description('List your LinkedIn connections')
    .option('--search <name>', 'Filter connections by name')
    .option('--count', 'Show total connection count only')
    .option('--recent', 'Sort by most recently connected')
    .option('--limit <n>', 'Limit number of results', '25')
    .option('--json', 'Output as JSON')
    .action(async (opts: {
      search?: string;
      count?: boolean;
      recent?: boolean;
      limit: string;
      json?: boolean;
    }) => {
      try {
        const limit = parseInt(opts.limit, 10);

        if (opts.count) {
          const data = await voyagerGet<{ count: number }>(ENDPOINTS.connections);
          if (opts.json) {
            printJson({ count: data.count });
          } else {
            console.log(`\n  ${theme.label('Total connections:')} ${theme.count(String(data.count))}\n`);
          }
          return;
        }

        const extraParams: Record<string, string | number | boolean> = {
          sortType: opts.recent ? 'RECENTLY_CONNECTED' : 'FIRST_NAME',
        };
        if (opts.search) {
          extraParams['q'] = 'search';
          extraParams['keyword'] = opts.search;
        }

        const connections = await paginate<VoyagerConnection>(ENDPOINTS.connectionsList, {
          limit,
          extraParams,
        });

        if (opts.json) {
          printJson(connections);
          return;
        }

        if (connections.length === 0) {
          console.log(theme.muted('\n  No connections found.\n'));
          return;
        }

        console.log(`\n  ${theme.label('Connections')} ${theme.muted(`(${connections.length} shown)`)}\n`);
        printTable(
          ['Name', 'Headline', 'Connected'],
          connections.map((c) => [
            `${c.firstName} ${c.lastName}`,
            truncate(c.headline ?? '', 50),
            c.connectedAt ? formatDate(c.connectedAt) : '—',
          ]),
        );
        console.log();
      } catch (err) {
        handleError(err);
      }
    });
}
