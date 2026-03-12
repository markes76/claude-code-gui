import { Command } from 'commander';
import { voyagerGet } from '../api/client.js';
import { ENDPOINTS } from '../api/voyager.js';
import type { VoyagerAnalyticsSummary } from '../api/types.js';
import { handleError } from '../utils/errors.js';
import { theme } from '../output/colors.js';
import { printJson } from '../output/json.js';
import { printKeyValue } from '../output/table.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function extractPostIdFromUrl(url: string): string | null {
  const match = url.match(/activity[:\-](\d+)/);
  return match ? `urn:li:activity:${match[1]}` : null;
}

export function registerAnalytics(program: Command): void {
  program
    .command('analytics')
    .description('View post performance analytics')
    .option('--post <post-url>', 'Analytics for a specific post')
    .option('--followers', 'Show follower growth and demographics')
    .option('--json', 'Output as JSON')
    .action(async (opts: { post?: string; followers?: boolean; json?: boolean }) => {
      try {
        if (opts.followers) {
          const data = await voyagerGet<{ elements: Array<Record<string, unknown>> }>(
            ENDPOINTS.followerStats,
          );

          if (opts.json) {
            printJson(data);
            return;
          }

          const elements = data.elements ?? [];
          console.log(`\n  ${theme.label('Follower Stats')}\n`);
          if (elements.length === 0) {
            console.log(theme.muted('  No follower data available.'));
          } else {
            for (const el of elements) {
              console.log(JSON.stringify(el, null, 2));
            }
          }
          return;
        }

        const now = Date.now();
        const params: Record<string, string | number | boolean> = {
          q: 'eventsBy',
          eventType: 'IMPRESSION',
          timeRange: `(start:${now - THIRTY_DAYS_MS},end:${now})`,
        };

        if (opts.post) {
          const urn = extractPostIdFromUrl(opts.post);
          if (!urn) {
            console.error(theme.error('✖ Could not extract post URN from URL.'));
            process.exit(1);
          }
          params['urn'] = urn;
        }

        const data = await voyagerGet<{ elements: VoyagerAnalyticsSummary[] }>(
          ENDPOINTS.analytics,
          { params },
        );

        if (opts.json) {
          printJson(data.elements ?? []);
          return;
        }

        const elements = data.elements ?? [];
        if (elements.length === 0) {
          console.log(theme.muted('\n  No analytics data available.\n'));
          return;
        }

        console.log(`\n  ${theme.label('Post Analytics')} ${theme.muted('(last 30 days)')}\n`);
        for (const el of elements) {
          printKeyValue({
            Impressions: el.totalImpressions,
            'Unique Impressions': el.uniqueImpressions,
            Engagements: el.totalEngagements,
            'Engagement Rate': el.engagementRate ? `${(el.engagementRate * 100).toFixed(2)}%` : undefined,
            Clicks: el.totalClicks,
            Reactions: el.totalReactions,
            Comments: el.totalComments,
            Reposts: el.totalReposts,
          });
        }
        console.log();
      } catch (err) {
        handleError(err);
      }
    });
}
