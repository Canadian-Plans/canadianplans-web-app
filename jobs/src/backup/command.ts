import { spawn } from 'node:child_process';

/**
 * Thin process-execution seam so every provider CLI call in `jobs/backup`,
 * `jobs/restore` and `jobs/retention` (Supabase CLI, `psql`, the Sanity CLI,
 * `age`) is injectable in tests without requiring the real binaries to be
 * installed. Production wiring uses `nodeRunCommand`; tests inject a fake that
 * asserts on `command`/`args` and returns fixed bytes.
 */
export interface RunCommandInput {
  input?: Uint8Array;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export interface RunCommandResult {
  stdout: Uint8Array;
  stderr: string;
  exitCode: number;
}

export type RunCommand = (
  command: string,
  args: readonly string[],
  options?: RunCommandInput,
) => Promise<RunCommandResult>;

/** Real process execution. Never logs argv or stdin (may carry secrets/bytes). */
export const nodeRunCommand: RunCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      cwd: options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    child.once('error', reject);
    child.once('close', (exitCode) => {
      resolve({
        stdout: new Uint8Array(Buffer.concat(stdoutChunks)),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        exitCode: exitCode ?? -1,
      });
    });
    if (options.input) child.stdin.end(Buffer.from(options.input));
    else child.stdin.end();
  });

/** Raised when a required provider command exits non-zero or errors. */
export class CommandFailedError extends Error {
  constructor(
    readonly command: string,
    readonly exitCode: number,
    stderrExcerpt: string,
  ) {
    super(`${command}_failed:${exitCode}:${stderrExcerpt.slice(0, 200)}`);
    this.name = 'CommandFailedError';
  }
}

export async function runOrThrow(
  run: RunCommand,
  command: string,
  args: readonly string[],
  options?: RunCommandInput,
): Promise<Uint8Array> {
  const result = await run(command, args, options);
  if (result.exitCode !== 0) throw new CommandFailedError(command, result.exitCode, result.stderr);
  return result.stdout;
}
