import { Command } from 'commander';
import { paginate } from '../utils/pagination.js';
import { ENDPOINTS } from '../api/voyager.js';
import type { VoyagerNotification } from '../api/types.js';
import { handleError } from '../utils/errors.js';
import { theme } from '../output/colors.js';
import { printJson } from '../output/json.js';
import { printTable, formatDate, truncate } from '../output/table.js';

export function registerNotifications(program: Command): void {
  program
    .command('notifications')
    .description('View your LinkedIn notifications')
    .option('--unread', 'Show unread notifications only')
    .option('--limit <n>', 'Limit number of results', '20')
    .option('--json', 'Output as JSON')
    .action(async (opts: { unread?: boolean; limit: string; json?: boolean }) => {
      try {
        const limit = parseInt(opts.limit, 10);

        const notifications = await paginate<VoyagerNotification>(ENDPOINTS.notificationsFeed, {
          limit,
        });

        const filtered = opts.unread ? notifications.filter((n) => !n.read) : notifications;

        if (opts.json) {
          printJson(filtered);
          return;
        }

        if (filtered.length === 0) {
          console.log(theme.muted('\n  No notifications found.\n'));
          return;
        }

        console.log(`\n  ${theme.label('Notifications')} ${theme.muted(`(${filtered.length} shown)`)}\n`);
        printTable(
          ['Notification', 'Detail', 'Status', 'Date'],
          filtered.map((n) => [
            truncate(n.headline?.text ?? '', 45),
            truncate(n.subtext?.text ?? '', 35),
            n.read ? theme.muted('read') : theme.warning('unread'),
            formatDate(n.publishedAt),
          ]),
        );
        console.log();
      } catch (err) {
        handleError(err);
      }
    });
}
