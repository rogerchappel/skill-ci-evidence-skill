#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { collectEvidence, renderMarkdown, checkEvidence } from './index.js';

const usage = `Usage:
  skill-ci-evidence collect [--repo <path>] [--log <path>] [--out <path>] [--json <path>]
  skill-ci-evidence check <evidence.json>`;

type CollectOptions = { repo: string; log?: string; out?: string; json?: string };
const collectOptions = new Set(['--repo', '--log', '--out', '--json']);

function fail(message: string): never {
  throw new Error(`${message}\n\n${usage}`);
}

function parseCollect(args: string[]): CollectOptions {
  const parsed: CollectOptions = {repo: '.'};
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    if (!option.startsWith('--')) fail(`unexpected positional argument: ${option}`);
    if (!collectOptions.has(option)) fail(`unknown collect option: ${option}`);
    if (seen.has(option)) fail(`duplicate collect option: ${option}`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) fail(`missing value for collect option: ${option}`);
    seen.add(option);
    parsed[option.slice(2) as keyof CollectOptions] = value;
  }
  return parsed;
}

function parseCheck(args: string[]): string {
  if (args.length === 0) fail('missing evidence json for check');
  if (args.length > 1) fail(`unexpected check argument: ${args[1]}`);
  if (args[0].startsWith('--')) fail(`unexpected check option: ${args[0]}`);
  return args[0];
}

function save(file: string | undefined, body: string) {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, body);
}

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === '--help' || cmd === '-h') {
    console.log(usage);
  } else if (cmd === 'collect') {
    if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
      console.log(usage);
    } else {
      const options = parseCollect(args);
      const report = collectEvidence({repo: options.repo, log: options.log});
      save(options.out, renderMarkdown(report));
      save(options.json, JSON.stringify(report,null,2)+'\n');
      if (!options.out && !options.json) console.log(renderMarkdown(report));
    }
  } else if (cmd === 'check') {
    if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
      console.log(usage);
    } else {
      const file = parseCheck(args);
      const report = JSON.parse(fs.readFileSync(file,'utf8'));
      const failures = checkEvidence(report);
      if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
      console.log('evidence check passed');
    }
  } else {
    fail(cmd ? `unknown command: ${cmd}` : 'missing command');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
