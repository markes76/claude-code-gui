import { Command } from 'commander';
import { readSession, hasSession } from '../auth/session.js';
import { voyagerGet } from '../api/client.js';
import { ENDPOINTS } from '../api/voyager.js';
import type { VoyagerMeResponse } from '../api/types.js';
import { handleError } from '../utils/errors.js';
import { theme } from '../output/colors.js';
import { printJson } from '../output/json.js';

export function registerStatus(program: Command): void {
  program
    .command('status')
    .description('Check if your LinkedIn session is valid')
    .option('--json', 'Output as JSON')
    .action(async (opts: { json?: boolean }) => {
      try {
        if (!hasSession()) {
          console.log(theme.warning('  ✖ Not logged in. Run: linkedin login'));
          process.exit(1);
        }

        const session = readSession()!;
        const data = await voyagerGet<VoyagerMeResponse>(ENDPOINTS.me, { delayMs: 0 });

        const profile = data.miniProfile;
        const name = profile ? `${profile.firstName} ${profile.lastName}` : 'Unknown';
        const headline = profile?.occupation ?? '';
        const identifier = profile?.publicIdentifier ?? '';

        if (opts.json) {
          printJson({ authenticated: true, name, headline, publicIdentifier: identifier, savedAt: session.savedAt });
          return;
        }

        console.log(theme.success('\n  ✔ Session is valid\n'));
        console.log(`  ${theme.label('Name:')}       ${theme.name(name)}`);
        if (headline) console.log(`  ${theme.label('Headline:')}   ${headline}`);
        if (identifier) console.log(`  ${theme.label('Profile:')}    https://www.linkedin.com/in/${identifier}`);
        console.log(`  ${theme.label('Saved at:')}   ${theme.muted(session.savedAt)}`);
        console.log();
      } catch (err) {
        handleError(err);
      }
    });
}
