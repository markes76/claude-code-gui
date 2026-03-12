import { Command } from 'commander';
import { paginate } from '../utils/pagination.js';
import { ENDPOINTS } from '../api/voyager.js';
import type { VoyagerFeedItem } from '../api/types.js';
import { handleError } from '../utils/errors.js';
import { theme } from '../output/colors.js';
import { printJson } from '../output/json.js';
import { printTable, formatDate, truncate } from '../output/table.js';

export function registerFeed(program: Command): void {
  const feedCmd = program
    .command('feed')
    .description('Browse your LinkedIn feed');

  feedCmd
    .option('--mine', 'Show only your own posts')
    .option('--stats', 'Include engagement stats (use with --mine)')
    .option('--limit <n>', 'Limit number of results', '20')
    .option('--json', 'Output as JSON')
    .action(async (opts: { mine?: boolean; stats?: boolean; limit: string; json?: boolean }) => {
      try {
        const limit = parseInt(opts.limit, 10);
        const extraParams: Record<string, string | number | boolean> = {
          q: opts.mine ? 'memberShareFeed' : 'chronologicalFeed',
          moduleKey: 'member-share',
          includeLongTermHistory: true,
        };

        const items = await paginate<VoyagerFeedItem>(ENDPOINTS.feed, { limit, extraParams });

        if (opts.json) {
          printJson(items);
          return;
        }

        if (items.length === 0) {
          console.log(theme.muted('\n  No feed items found.\n'));
          return;
        }

        console.log(`\n  ${theme.label(opts.mine ? 'Your Posts' : 'Feed')} ${theme.muted(`(${items.length} shown)`)}\n`);

        if (opts.stats && opts.mine) {
          printTable(
            ['Author', 'Post Preview', 'Likes', 'Comments', 'Reposts', 'Date'],
            items.map((item) => {
              const author = item.actor?.name?.text ?? 'Unknown';
              const text = item.commentary?.text?.text ?? item.actor?.description?.text ?? '';
              const counts = item.socialDetail?.totalSocialActivityCounts;
              return [
                truncate(author, 25),
                truncate(text, 45),
                String(counts?.numLikes ?? 0),
                String(counts?.numComments ?? 0),
                String(counts?.numShares ?? 0),
                item.createdAt ? formatDate(item.createdAt) : '—',
              ];
            }),
          );
        } else {
          printTable(
            ['Author', 'Post Preview', 'Date'],
            items.map((item) => {
              const author = item.actor?.name?.text ?? 'Unknown';
              const text = item.commentary?.text?.text ?? item.actor?.description?.text ?? '';
              return [
                truncate(author, 30),
                truncate(text, 60),
                item.createdAt ? formatDate(item.createdAt) : '—',
              ];
            }),
          );
        }
        console.log();
      } catch (err) {
        handleError(err);
      }
    });
}

export function registerPosts(program: Command): void {
  program
    .command('posts <post-url>')
    .description('Get a specific post with its comments')
    .option('--json', 'Output as JSON')
    .action(async (postUrl: string, opts: { json?: boolean }) => {
      try {
        // Extract post URN from URL if possible
        // LinkedIn post URLs look like: /posts/activity-XXXX or /feed/update/urn:li:activity:XXXX
        const urnMatch = postUrl.match(/activity[:\-](\d+)/);
        if (!urnMatch) {
          console.error(theme.error('✖ Could not extract post ID from URL. Expected format: .../activity-XXXXXXXXX'));
          process.exit(1);
        }
        const urn = `urn:li:activity:${urnMatch[1]}`;

        const { voyagerGet } = await import('../api/client.js');
        const data = await voyagerGet<{ value?: VoyagerFeedItem }>(
          `${ENDPOINTS.feed}/${encodeURIComponent(urn)}`,
        );

        if (opts.json) {
          printJson(data);
          return;
        }

        const item = data.value;
        if (!item) {
          console.log(theme.muted('  Post not found or not accessible.'));
          return;
        }

        const author = item.actor?.name?.text ?? 'Unknown';
        const text = item.commentary?.text?.text ?? '';
        const counts = item.socialDetail?.totalSocialActivityCounts;

        console.log(`\n  ${theme.name(author)}\n`);
        if (text) console.log(`  ${text}\n`);
        if (counts) {
          console.log(
            `  ${theme.label('Likes:')} ${counts.numLikes}  ` +
            `${theme.label('Comments:')} ${counts.numComments}  ` +
            `${theme.label('Reposts:')} ${counts.numShares}`,
          );
        }
        console.log();
      } catch (err) {
        handleError(err);
      }
    });
}
