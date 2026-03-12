import { Command } from 'commander';
import { paginate } from '../utils/pagination.js';
import { voyagerGet } from '../api/client.js';
import { ENDPOINTS } from '../api/voyager.js';
import type { VoyagerInvitation, VoyagerSearchResult } from '../api/types.js';
import { handleError } from '../utils/errors.js';
import { theme } from '../output/colors.js';
import { printJson } from '../output/json.js';
import { printTable, formatDate, truncate } from '../output/table.js';

export function registerNetwork(program: Command): void {
  const networkCmd = program
    .command('network')
    .description('Manage your LinkedIn network');

  // linkedin network invitations [--sent]
  networkCmd
    .command('invitations')
    .description('View pending connection requests')
    .option('--sent', 'Show sent (outgoing) invitations')
    .option('--limit <n>', 'Limit number of results', '20')
    .option('--json', 'Output as JSON')
    .action(async (opts: { sent?: boolean; limit: string; json?: boolean }) => {
      try {
        const limit = parseInt(opts.limit, 10);
        const extraParams: Record<string, string | number | boolean> = {
          q: opts.sent ? 'sent' : 'received',
          invitationType: 'CONNECTION',
        };

        const invitations = await paginate<VoyagerInvitation>(ENDPOINTS.invitations, {
          limit,
          extraParams,
        });

        if (opts.json) {
          printJson(invitations);
          return;
        }

        const label = opts.sent ? 'Sent Invitations' : 'Received Invitations';
        console.log(`\n  ${theme.label(label)} ${theme.muted(`(${invitations.length} shown)`)}\n`);

        if (invitations.length === 0) {
          console.log(theme.muted('  No invitations found.'));
          return;
        }

        printTable(
          ['Name', 'Headline', 'Message', 'Sent'],
          invitations.map((inv) => {
            const person = opts.sent ? inv.toMember : inv.fromMember;
            return [
              person ? `${person.firstName} ${person.lastName}` : 'Unknown',
              truncate(person?.headline ?? '', 40),
              truncate(inv.message ?? '', 40),
              formatDate(inv.sentTime),
            ];
          }),
        );
        console.log();
      } catch (err) {
        handleError(err);
      }
    });

  // linkedin network suggestions
  networkCmd
    .command('suggestions')
    .description('People you may know')
    .option('--limit <n>', 'Limit number of results', '10')
    .option('--json', 'Output as JSON')
    .action(async (opts: { limit: string; json?: boolean }) => {
      try {
        const limit = parseInt(opts.limit, 10);

        const suggestions = await paginate<VoyagerSearchResult>(ENDPOINTS.networkSuggestions, {
          limit,
          extraParams: { q: 'pymk', maxFeedUpdateAge: 0 },
        });

        if (opts.json) {
          printJson(suggestions);
          return;
        }

        console.log(`\n  ${theme.label('People You May Know')} ${theme.muted(`(${suggestions.length} shown)`)}\n`);
        printTable(
          ['Name', 'Headline', 'Profile'],
          suggestions.map((s) => [
            truncate(s.title?.text ?? '', 30),
            truncate(s.primarySubtitle?.text ?? '', 45),
            s.publicIdentifier ? `https://www.linkedin.com/in/${s.publicIdentifier}` : s.navigationUrl ?? '—',
          ]),
        );
        console.log();
      } catch (err) {
        handleError(err);
      }
    });
}
