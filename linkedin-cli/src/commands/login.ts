import { Command } from 'commander';
import { launchLoginFlow } from '../auth/browser.js';
import { writeSession } from '../auth/session.js';
import { handleError } from '../utils/errors.js';
import { theme } from '../output/colors.js';

export function registerLogin(program: Command): void {
  program
    .command('login')
    .description('Authenticate with LinkedIn via browser')
    .action(async () => {
      try {
        console.log(theme.primary('\n  LinkedIn CLI — Login\n'));
        console.log(theme.muted('  Opening Chrome browser for LinkedIn authentication...'));
        console.log(theme.muted('  This uses a persistent browser profile to avoid detection.\n'));

        const cookies = await launchLoginFlow();

        if (!cookies.liAt || !cookies.jsessionId) {
          console.error(theme.error('✖ Could not extract session cookies. Did you complete the login?'));
          process.exit(1);
        }

        writeSession({
          liAt: cookies.liAt,
          jsessionId: cookies.jsessionId,
          savedAt: new Date().toISOString(),
        });

        console.log(theme.success('\n  ✔ Logged in successfully. Session saved.\n'));
        console.log(theme.muted('  Run: linkedin status — to verify your session'));
      } catch (err) {
        handleError(err);
      }
    });
}
