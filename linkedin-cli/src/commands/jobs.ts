import { Command } from 'commander';
import { paginate } from '../utils/pagination.js';
import { ENDPOINTS } from '../api/voyager.js';
import type { VoyagerJobPosting } from '../api/types.js';
import { handleError } from '../utils/errors.js';
import { theme } from '../output/colors.js';
import { printJson } from '../output/json.js';
import { printTable, formatDate, truncate } from '../output/table.js';

export function registerJobs(program: Command): void {
  const jobsCmd = program
    .command('jobs')
    .description('View your LinkedIn job activity');

  jobsCmd
    .command('saved')
    .description('List your saved jobs')
    .option('--limit <n>', 'Limit results', '20')
    .option('--json', 'Output as JSON')
    .action(async (opts: { limit: string; json?: boolean }) => {
      try {
        const limit = parseInt(opts.limit, 10);
        const jobs = await paginate<VoyagerJobPosting>(ENDPOINTS.savedJobs, {
          limit,
          extraParams: { q: 'savedJobs' },
        });

        if (opts.json) { printJson(jobs); return; }
        console.log(`\n  ${theme.label('Saved Jobs')} ${theme.muted(`(${jobs.length} shown)`)}\n`);
        renderJobs(jobs);
      } catch (err) {
        handleError(err);
      }
    });

  jobsCmd
    .command('applied')
    .description('List jobs you have applied to')
    .option('--limit <n>', 'Limit results', '20')
    .option('--json', 'Output as JSON')
    .action(async (opts: { limit: string; json?: boolean }) => {
      try {
        const limit = parseInt(opts.limit, 10);
        const jobs = await paginate<VoyagerJobPosting>(ENDPOINTS.savedJobs, {
          limit,
          extraParams: { q: 'applied' },
        });

        if (opts.json) { printJson(jobs); return; }
        console.log(`\n  ${theme.label('Applied Jobs')} ${theme.muted(`(${jobs.length} shown)`)}\n`);
        renderJobs(jobs);
      } catch (err) {
        handleError(err);
      }
    });

  jobsCmd
    .command('recommended')
    .description('Recommended jobs for you')
    .option('--limit <n>', 'Limit results', '10')
    .option('--json', 'Output as JSON')
    .action(async (opts: { limit: string; json?: boolean }) => {
      try {
        const limit = parseInt(opts.limit, 10);
        const jobs = await paginate<VoyagerJobPosting>(ENDPOINTS.recommendedJobs, { limit });

        if (opts.json) { printJson(jobs); return; }
        console.log(`\n  ${theme.label('Recommended Jobs')} ${theme.muted(`(${jobs.length} shown)`)}\n`);
        renderJobs(jobs);
      } catch (err) {
        handleError(err);
      }
    });
}

function renderJobs(jobs: VoyagerJobPosting[]): void {
  if (jobs.length === 0) {
    console.log(theme.muted('  No jobs found.'));
    return;
  }
  printTable(
    ['Title', 'Company', 'Location', 'Listed'],
    jobs.map((j) => [
      truncate(j.title ?? '', 35),
      truncate(j.companyName ?? '', 25),
      truncate(j.locationName ?? '', 20),
      j.listedAt ? formatDate(j.listedAt) : '—',
    ]),
  );
  console.log();
}
