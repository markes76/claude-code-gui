import chalk from 'chalk';

export class LinkedInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LinkedInError';
  }
}

export class AuthError extends LinkedInError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends LinkedInError {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export function handleError(err: unknown): never {
  if (err instanceof AuthError) {
    console.error(chalk.red('✖ Auth error:'), err.message);
    process.exit(1);
  }
  if (err instanceof RateLimitError) {
    console.error(chalk.yellow('⚠ Rate limit:'), err.message);
    process.exit(1);
  }
  if (err instanceof LinkedInError) {
    console.error(chalk.red('✖ LinkedIn error:'), err.message);
    process.exit(1);
  }
  if (err instanceof Error) {
    console.error(chalk.red('✖ Error:'), err.message);
    process.exit(1);
  }
  console.error(chalk.red('✖ Unknown error:'), err);
  process.exit(1);
}
