import fs from 'node:fs'; import path from 'node:path';
export interface EvidenceInput { repo: string; log?: string; }
export interface EvidenceReport { repo: string; packageName: string; version: string; scripts: string[]; files: string[]; checks: Record<string,string>; warnings: string[]; missing: string[]; }
function readJson(file: string): any { return JSON.parse(fs.readFileSync(file,'utf8')); }
function exists(file: string): boolean { return fs.existsSync(file); }
export function collectEvidence(input: EvidenceInput): EvidenceReport {
  const pkgPath = path.join(input.repo,'package.json');
  const pkg = readJson(pkgPath);
  const scripts = Object.keys(pkg.scripts || {});
  const files = Array.isArray(pkg.files) ? pkg.files : [];
  const logText = input.log && exists(input.log) ? fs.readFileSync(input.log,'utf8') : '';
  const checks: Record<string,string> = {};
  for (const name of ['npm run check','npm test','npm run smoke','npm pack --dry-run']) checks[name] = logText.toLowerCase().includes(name.toLowerCase()) ? 'observed' : 'not observed';
  const required = ['SKILL.md','docs/PRD.md','docs/TASKS.md','fixtures'];
  const missing = required.filter((entry) => !exists(path.join(input.repo, entry)) && !files.includes(entry));
  const warnings: string[] = [];
  for (const script of ['check','test','smoke']) if (!scripts.includes(script)) warnings.push('missing npm script: '+script);
  if (!files.includes('SKILL.md')) warnings.push('package files should include SKILL.md');
  return { repo: input.repo, packageName: pkg.name || 'unknown', version: pkg.version || '0.0.0', scripts, files, checks, warnings, missing };
}
export function renderMarkdown(report: EvidenceReport): string { return ['# Skill CI Evidence','',`Package: ${report.packageName}@${report.version}`,`Repo: ${report.repo}`,'','## Checks',...Object.entries(report.checks).map(([k,v])=>`- ${k}: ${v}`),'','## Warnings',...(report.warnings.length?report.warnings.map(w=>`- ${w}`):['- none']),'','## Missing',...(report.missing.length?report.missing.map(m=>`- ${m}`):['- none']),''].join('\n'); }
export function checkEvidence(report: EvidenceReport): string[] { const failures = [...report.missing]; if (report.warnings.some(w=>w.includes('test'))) failures.push('test script missing'); return failures; }
