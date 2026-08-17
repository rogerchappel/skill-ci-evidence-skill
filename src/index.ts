import fs from 'node:fs'; import path from 'node:path';
export interface EvidenceInput { repo: string; log?: string; }
export interface EvidenceReport { repo: string; packageName: string; version: string; scripts: string[]; files: string[]; checks: Record<string,string>; warnings: string[]; missing: string[]; invalid: string[]; }
const REQUIRED_SCRIPTS = ['check','test','smoke'];
const REQUIRED_COMMANDS = ['npm run check','npm test','npm run smoke','npm pack --dry-run'];
const REQUIRED_PATHS = ['SKILL.md','docs/PRD.md','docs/TASKS.md','fixtures'];
const REQUIRED_FILES = REQUIRED_PATHS.slice(0, 3);
type CommandOutcome = 'passed' | 'failed' | 'malformed' | 'ambiguous' | 'not observed';
const REPORT_STRING_FIELDS = ['repo','packageName','version'] as const;
const REPORT_ARRAY_FIELDS = ['scripts','files','warnings','missing','invalid'] as const;
function readJson(file: string): any { return JSON.parse(fs.readFileSync(file,'utf8')); }
function exists(file: string): boolean { return fs.existsSync(file); }
function requiredPathProblem(repo: string, entry: string): string | undefined {
  const target = path.join(repo, entry);
  if (!exists(target)) return undefined;
  const expected = REQUIRED_FILES.includes(entry) ? 'regular file' : 'directory';
  const valid = expected === 'regular file' ? fs.statSync(target).isFile() : fs.statSync(target).isDirectory();
  return valid ? undefined : `${entry} (expected ${expected})`;
}
function isIncludedInPackage(files: string[], requiredPath: string): boolean {
  return files.some((entry) => requiredPath === entry || requiredPath.startsWith(`${entry.replace(/\/$/, '')}/`));
}
function commandOutcome(logText: string, command: string): CommandOutcome {
  const prefix = `${command} :: exit `;
  const records = logText.split(/\r?\n/)
    .filter((line) => line.startsWith(prefix))
    .map((line) => line.slice(prefix.length));
  if (records.length === 0) return 'not observed';
  if (records.length > 1) return 'ambiguous';
  if (!/^\d+$/.test(records[0])) return 'malformed';
  return Number(records[0]) === 0 ? 'passed' : 'failed';
}
export function collectEvidence(input: EvidenceInput): EvidenceReport {
  const pkgPath = path.join(input.repo,'package.json');
  const pkg = readJson(pkgPath);
  const scripts = Object.keys(pkg.scripts || {});
  const files = Array.isArray(pkg.files) ? pkg.files : [];
  const logText = input.log && exists(input.log) ? fs.readFileSync(input.log,'utf8') : '';
  const checks: Record<string,string> = {};
  for (const name of REQUIRED_COMMANDS) checks[name] = commandOutcome(logText, name);
  const missing = REQUIRED_PATHS.filter((entry) => !exists(path.join(input.repo, entry)));
  const invalid = REQUIRED_PATHS.flatMap((entry) => {
    const problem = requiredPathProblem(input.repo, entry);
    return problem ? [problem] : [];
  });
  const warnings: string[] = [];
  for (const script of REQUIRED_SCRIPTS) if (!scripts.includes(script)) warnings.push('missing npm script: '+script);
  for (const entry of REQUIRED_PATHS) if (!isIncludedInPackage(files, entry)) warnings.push(`package files should include ${entry}`);
  return { repo: input.repo, packageName: pkg.name || 'unknown', version: pkg.version || '0.0.0', scripts, files, checks, warnings, missing, invalid };
}
export function renderMarkdown(report: EvidenceReport): string { return ['# Skill CI Evidence','',`Package: ${report.packageName}@${report.version}`,`Repo: ${report.repo}`,'','## Checks',...Object.entries(report.checks).map(([k,v])=>`- ${k}: ${v}`),'','## Warnings',...(report.warnings.length?report.warnings.map(w=>`- ${w}`):['- none']),'','## Missing',...(report.missing.length?report.missing.map(m=>`- ${m}`):['- none']),'','## Invalid',...(report.invalid.length?report.invalid.map(m=>`- ${m}`):['- none']),''].join('\n'); }
function invalidReport(message: string): never {
  throw new Error(`invalid evidence report: ${message}`);
}
export function validateEvidenceReport(value: unknown): EvidenceReport {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalidReport('expected a JSON object');
  const report = value as Record<string, unknown>;
  for (const field of [...REPORT_STRING_FIELDS, ...REPORT_ARRAY_FIELDS, 'checks'] as const) {
    if (!Object.prototype.hasOwnProperty.call(report, field)) invalidReport(`${field} is required`);
  }
  for (const field of REPORT_STRING_FIELDS) {
    if (typeof report[field] !== 'string') invalidReport(`${field} must be a string`);
  }
  for (const field of REPORT_ARRAY_FIELDS) {
    if (!Array.isArray(report[field]) || !report[field].every((entry) => typeof entry === 'string')) {
      invalidReport(`${field} must be an array of strings`);
    }
  }
  if (typeof report.checks !== 'object' || report.checks === null || Array.isArray(report.checks) ||
      !Object.values(report.checks).every((outcome) => typeof outcome === 'string')) {
    invalidReport('checks must be an object with string values');
  }
  for (const command of REQUIRED_COMMANDS) {
    if (!Object.prototype.hasOwnProperty.call(report.checks, command)) {
      invalidReport(`checks is missing required key: ${command}`);
    }
  }
  return report as unknown as EvidenceReport;
}
export function checkEvidence(value: unknown): string[] {
  const report = validateEvidenceReport(value);
  const failures = report.missing.map((entry) => `required path missing: ${entry}`);
  failures.push(...report.invalid.map((entry) => `required path invalid: ${entry}`));
  for (const script of REQUIRED_SCRIPTS) {
    if (!report.scripts.includes(script)) failures.push(`required npm script missing: ${script}`);
  }
  for (const command of REQUIRED_COMMANDS) {
    const outcome = report.checks[command];
    if (outcome !== 'passed') failures.push(`required release command did not pass: ${command} (${outcome || 'missing outcome'})`);
  }
  return failures;
}
