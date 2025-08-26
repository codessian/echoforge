#!/usr/bin/env node
import { Command } from 'commander';
import { runChecks } from './index';

const program = new Command();
program
  .name('ef-env')
  .description('EchoForge development environment validator')
  .option('-j, --json', 'Output JSON', false)
  .option('-c, --config <file>', 'Path to YAML/JSON config')
  .option('--no-open-docs', 'Do not attempt to open docs file')
  .option('--required-node <num>', 'Minimum Node major version', (v) => Number(v))
  .option('--required-pnpm <num>', 'Minimum pnpm major version', (v) => Number(v))
  .parse(process.argv);

async function main() {
  const opts = program.opts();

  const res = await runChecks({
    json: !!opts.json,
    openDocs: opts.openDocs !== false,
    configPath: opts.config,
    requiredNode: opts.requiredNode,
    requiredPnpm: opts.requiredPnpm,
  });

  if (opts.json) {
    console.log(JSON.stringify(res, null, 2));
  }
  process.exit(res.summary.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('An unexpected error occurred:', err);
  process.exit(1);
});
