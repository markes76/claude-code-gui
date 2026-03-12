import { Command } from 'commander';
import { paginate } from '../utils/pagination.js';
import { ENDPOINTS } from '../api/voyager.js';
import type { VoyagerMessage } from '../api/types.js';
import { handleError } from '../utils/errors.js';
import { theme } from '../output/colors.js';
import { printJson } from '../output/json.js';
import { printTable, formatDate, truncate } from '../output/table.js';

export function registerMessages(program: Command): void {
  program
    .command('messages')
    .description('View your LinkedIn messages (read-only)')
    .option('--unread', 'Show unread messages only')
    .option('--search <keyword>', 'Search messages by keyword')
    .option('--limit <n>', 'Limit number of conversations', '20')
    .option('--json', 'Output as JSON')
    .action(async (opts: { unread?: boolean; search?: string; limit: string; json?: boolean }) => {
      try {
        const limit = parseInt(opts.limit, 10);
        const extraParams: Record<string, string | number | boolean> = {
          q: opts.search ? 'search' : 'inbox',
        };
        if (opts.search) extraParams['keywords'] = opts.search;

        const conversations = await paginate<VoyagerMessage>(ENDPOINTS.conversations, {
          limit,
          extraParams,
        });

        const filtered = opts.unread ? conversations.filter((c) => !c.read) : conversations;

        if (opts.json) {
          printJson(filtered);
          return;
        }

        if (filtered.length === 0) {
          console.log(theme.muted('\n  No messages found.\n'));
          return;
        }

        console.log(`\n  ${theme.label('Messages')} ${theme.muted(`(${filtered.length} shown)`)}\n`);
        printTable(
          ['Participants', 'Last Message Preview', 'Status', 'Date'],
          filtered.map((conv) => {
            const names = conv.participants
              .map((p) => {
                const m = p.participantType?.member;
                return m ? `${m.firstName.text} ${m.lastName.text}` : 'Unknown';
              })
              .join(', ');

            const lastEvent = conv.events?.[conv.events.length - 1];
            const preview = lastEvent?.eventContent?.attributedBody?.text ?? conv.subject ?? '';

            return [
              truncate(names, 30),
              truncate(preview, 45),
              conv.read ? theme.muted('read') : theme.warning('unread'),
              formatDate(conv.lastActivityAt),
            ];
          }),
        );
        console.log();
      } catch (err) {
        handleError(err);
      }
    });
}
