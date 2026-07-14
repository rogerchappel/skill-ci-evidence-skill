#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
import { collectEvidence, renderMarkdown, checkEvidence } from './index.js';
function arg(name: string, fallback?: string): string | undefined { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i+1] : fallback; }
function save(file: string | undefined, body: string) { if (!file) return; fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, body); }
const cmd = process.argv[2];
try {
  if (cmd === 'collect') { const repo = arg('--repo','.')!; const log = arg('--log'); const report = collectEvidence({repo, log}); save(arg('--out'), renderMarkdown(report)); save(arg('--json'), JSON.stringify(report,null,2)+'\n'); if (!arg('--out') && !arg('--json')) console.log(renderMarkdown(report)); }
  else if (cmd === 'check') { const file = process.argv[3]; if (!file) throw new Error('missing evidence json'); const report = JSON.parse(fs.readFileSync(file,'utf8')); const failures = checkEvidence(report); if (failures.length) { console.error(failures.join('\n')); process.exit(1); } console.log('evidence check passed'); }
  else { console.error('usage: skill-ci-evidence collect --repo <path> | check <evidence.json>'); process.exit(1); }
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); }
