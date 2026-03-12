import { Command } from 'commander';
import { clearSession, hasSession } from '../auth/session.js';
import { theme } from '../output/colors.js';

export function registerLogout(program: Command): void {
  program
    .command('logout')
    .description('Clear the saved LinkedIn session')
    .action(() => {
      if (!hasSession()) {
        console.log(theme.muted('  No active session to clear.'));
        return;
      }
      clearSession();
      console.log(theme.success('  ✔ Logged out. Session cleared.'));
    });
}
