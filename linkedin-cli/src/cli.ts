import { Command } from 'commander';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

import { registerLogin } from './commands/login.js';
import { registerLogout } from './commands/logout.js';
import { registerStatus } from './commands/status.js';
import { registerProfile } from './commands/profile.js';
import { registerConnections } from './commands/connections.js';
import { registerFeed, registerPosts } from './commands/feed.js';
import { registerMessages } from './commands/messages.js';
import { registerNotifications } from './commands/notifications.js';
import { registerNetwork } from './commands/network.js';
import { registerAnalytics } from './commands/analytics.js';
import { registerSearch } from './commands/search.js';
import { registerJobs } from './commands/jobs.js';
import { registerSkill } from './commands/skill.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
    ) as { version: string };
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

const program = new Command();

program
  .name('linkedin')
  .description('Unofficial LinkedIn CLI for agentic coding tools')
  .version(getVersion(), '-v, --version')
  .option('--no-color', 'Disable colored output');

// Auth
registerLogin(program);
registerLogout(program);
registerStatus(program);

// Data
registerProfile(program);
registerConnections(program);
registerFeed(program);
registerPosts(program);
registerMessages(program);
registerNotifications(program);
registerNetwork(program);
registerAnalytics(program);
registerSearch(program);
registerJobs(program);

// Skill
registerSkill(program);

// Handle unknown commands
program.on('command:*', () => {
  console.error(`\n  Unknown command: ${program.args.join(' ')}`);
  console.error('  Run: linkedin --help\n');
  process.exit(1);
});

program.parse(process.argv);
