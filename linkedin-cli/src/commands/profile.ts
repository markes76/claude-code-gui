import { Command } from 'commander';
import { voyagerGet } from '../api/client.js';
import { ENDPOINTS } from '../api/voyager.js';
import { handleError } from '../utils/errors.js';
import { theme } from '../output/colors.js';
import { printJson } from '../output/json.js';
import { printKeyValue } from '../output/table.js';
import { readSession } from '../auth/session.js';

interface ProfileViewResponse {
  profile?: {
    firstName: string;
    lastName: string;
    headline: string;
    summary: string;
    locationName: string;
    industryName: string;
    publicIdentifier: string;
    entityUrn: string;
  };
}

function extractIdentifierFromUrl(input: string): string {
  // https://www.linkedin.com/in/johndoe/ → johndoe
  const match = input.match(/linkedin\.com\/in\/([^/?#]+)/);
  if (match) return match[1];
  return input;
}

async function fetchMyIdentifier(): Promise<string> {
  const data = await voyagerGet<{ miniProfile?: { publicIdentifier: string } }>(
    ENDPOINTS.me, { delayMs: 0 },
  );
  return data.miniProfile?.publicIdentifier ?? '';
}

export function registerProfile(program: Command): void {
  program
    .command('profile [linkedin-url]')
    .description('View a LinkedIn profile (defaults to your own)')
    .option('--json', 'Output as JSON')
    .action(async (linkedinUrl: string | undefined, opts: { json?: boolean }) => {
      try {
        let identifier: string;

        if (linkedinUrl) {
          identifier = extractIdentifierFromUrl(linkedinUrl);
        } else {
          identifier = await fetchMyIdentifier();
          if (!identifier) {
            console.error(theme.error('✖ Could not determine your profile identifier.'));
            process.exit(1);
          }
        }

        const data = await voyagerGet<ProfileViewResponse>(ENDPOINTS.profileView(identifier));
        const p = data.profile;

        if (!p) {
          console.error(theme.error(`✖ Profile not found: ${identifier}`));
          process.exit(1);
        }

        if (opts.json) {
          printJson(p);
          return;
        }

        console.log(`\n  ${theme.primary('●')} ${theme.name(`${p.firstName} ${p.lastName}`)}\n`);
        printKeyValue({
          Headline: p.headline,
          Location: p.locationName,
          Industry: p.industryName,
          URL: `https://www.linkedin.com/in/${p.publicIdentifier}`,
        });

        if (p.summary) {
          console.log(`\n  ${theme.label('About')}\n`);
          const lines = p.summary.split('\n').map((l) => `  ${l}`);
          console.log(lines.join('\n'));
        }
        console.log();
      } catch (err) {
        handleError(err);
      }
    });
}
