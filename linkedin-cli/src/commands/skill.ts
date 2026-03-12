import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { theme } from '../output/colors.js';
import { handleError } from '../utils/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Skill install location (Claude Code skill directory)
const CLAUDE_SKILLS_DIR = join(process.cwd(), '.claude', 'skills');
const SKILL_FILENAME = 'linkedin-cli.md';
const SKILL_DEST = join(CLAUDE_SKILLS_DIR, SKILL_FILENAME);

// Skill source — bundled in package or loaded from docs/
function getSkillContent(): string {
  // Try adjacent docs dir (installed package)
  const candidates = [
    join(__dirname, '..', '..', 'docs', 'skill.md'),
    join(__dirname, '..', 'docs', 'skill.md'),
    join(process.cwd(), 'docs', 'skill.md'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf-8');
    }
  }

  throw new Error('skill.md not found. Try reinstalling linkedin-cli.');
}

export function registerSkill(program: Command): void {
  const skillCmd = program
    .command('skill')
    .description('Manage the LinkedIn CLI agent skill for Claude Code / Cursor / OpenClaw');

  skillCmd
    .command('install')
    .description('Install the LinkedIn CLI skill into .claude/skills/')
    .action(() => {
      try {
        const content = getSkillContent();
        mkdirSync(CLAUDE_SKILLS_DIR, { recursive: true });
        writeFileSync(SKILL_DEST, content, 'utf-8');
        console.log(theme.success(`\n  ✔ Skill installed: ${SKILL_DEST}\n`));
        console.log(theme.muted('  Claude Code will now recognize linkedin-cli commands.\n'));
      } catch (err) {
        handleError(err);
      }
    });

  skillCmd
    .command('uninstall')
    .description('Remove the LinkedIn CLI skill from .claude/skills/')
    .action(() => {
      try {
        if (!existsSync(SKILL_DEST)) {
          console.log(theme.muted('  Skill is not installed.'));
          return;
        }
        unlinkSync(SKILL_DEST);
        console.log(theme.success('  ✔ Skill removed.'));
      } catch (err) {
        handleError(err);
      }
    });

  skillCmd
    .command('status')
    .description('Check if the skill is installed')
    .action(() => {
      if (existsSync(SKILL_DEST)) {
        console.log(theme.success(`\n  ✔ Skill installed at: ${SKILL_DEST}\n`));
      } else {
        console.log(theme.warning(`\n  ✖ Skill not installed. Run: linkedin skill install\n`));
      }
    });

  skillCmd
    .command('show')
    .description('Display the skill file content')
    .action(() => {
      try {
        const content = getSkillContent();
        console.log(content);
      } catch (err) {
        handleError(err);
      }
    });
}
