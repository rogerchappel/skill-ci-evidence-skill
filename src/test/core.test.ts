import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { collectEvidence, checkEvidence, validateEvidenceReport } from '../index.js';
test('collects passing repo evidence', () => { const report = collectEvidence({repo:'fixtures/passing-skill', log:'fixtures/release-check.log'}); assert.equal(report.packageName, 'passing-skill'); assert.equal(report.missing.length, 0); assert.equal(report.warnings.length, 0); assert.equal(checkEvidence(report).length, 0); });
test('flags incomplete package evidence', () => { const report = collectEvidence({repo:'fixtures/failing-skill'}); assert.ok(report.missing.includes('SKILL.md')); assert.ok(checkEvidence(report).length > 0); });
test('does not treat package file declarations as evidence that required paths exist', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-ci-evidence-paths-'));
  try {
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({
      name: 'missing-required-paths',
      version: '0.1.0',
      scripts: {check: 'echo check', test: 'echo test', smoke: 'echo smoke'},
      files: ['SKILL.md', 'docs/PRD.md', 'docs/TASKS.md', 'fixtures']
    }));
    const report = collectEvidence({repo:directory, log:'fixtures/release-check.log'});
    assert.deepEqual(report.missing, ['SKILL.md', 'docs/PRD.md', 'docs/TASKS.md', 'fixtures']);
    assert.deepEqual(checkEvidence(report).filter((failure) => failure.includes('required path missing')), [
      'required path missing: SKILL.md',
      'required path missing: docs/PRD.md',
      'required path missing: docs/TASKS.md',
      'required path missing: fixtures'
    ]);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});
test('requires documents to be regular files and fixtures to be a directory', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-ci-evidence-types-'));
  try {
    fs.cpSync('fixtures/passing-skill', directory, {recursive:true});
    for (const entry of ['SKILL.md', 'docs/PRD.md', 'docs/TASKS.md']) {
      fs.rmSync(path.join(directory, entry));
      fs.mkdirSync(path.join(directory, entry));
    }
    fs.rmSync(path.join(directory, 'fixtures'), {recursive:true});
    fs.writeFileSync(path.join(directory, 'fixtures'), 'not a directory');
    const report = collectEvidence({repo:directory, log:'fixtures/release-check.log'});
    assert.deepEqual(report.missing, []);
    assert.deepEqual(report.invalid, [
      'SKILL.md (expected regular file)',
      'docs/PRD.md (expected regular file)',
      'docs/TASKS.md (expected regular file)',
      'fixtures (expected directory)'
    ]);
    assert.deepEqual(checkEvidence(report).filter((failure) => failure.includes('required path invalid')), [
      'required path invalid: SKILL.md (expected regular file)',
      'required path invalid: docs/PRD.md (expected regular file)',
      'required path invalid: docs/TASKS.md (expected regular file)',
      'required path invalid: fixtures (expected directory)'
    ]);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});
test('reports package inclusion intent separately from path existence', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-ci-evidence-package-'));
  try {
    fs.cpSync('fixtures/passing-skill', directory, {recursive:true});
    const packageJson = path.join(directory, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    fs.writeFileSync(packageJson, JSON.stringify({...pkg, files: ['SKILL.md', 'fixtures']}));
    const unpackaged = collectEvidence({repo:directory, log:'fixtures/release-check.log'});
    assert.deepEqual(unpackaged.missing, []);
    assert.deepEqual(unpackaged.warnings, [
      'package files should include docs/PRD.md',
      'package files should include docs/TASKS.md'
    ]);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});
test('requires check and smoke scripts', () => {
  const report = collectEvidence({repo:'fixtures/warning-skill', log:'fixtures/release-check.log'});
  assert.deepEqual(
    checkEvidence(report).filter((failure) => failure.includes('npm script')),
    ['required npm script missing: check', 'required npm script missing: smoke']
  );
});
test('requires every release command to be observed', () => {
  const report = collectEvidence({repo:'fixtures/passing-skill'});
  assert.deepEqual(
    checkEvidence(report).filter((failure) => failure.includes('not observed')),
    [
      'required release command did not pass: npm run check (not observed)',
      'required release command did not pass: npm test (not observed)',
      'required release command did not pass: npm run smoke (not observed)',
      'required release command did not pass: npm pack --dry-run (not observed)'
    ]
  );
});
test('rejects failed, misleading, malformed, and duplicate command outcomes', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-ci-evidence-logs-'));
  try {
    const cases = [
      ['failed', 'npm run check :: exit 1\n', 'failed'],
      ['mention', 'next run: npm run check :: exit 0\n', 'not observed'],
      ['incomplete', 'npm run check PASS\n', 'not observed'],
      ['malformed', 'npm run check :: exit nope\n', 'malformed'],
      ['valid-malformed', 'npm run check :: exit 0\nnpm run check :: exit nope\n', 'ambiguous'],
      ['malformed-only-duplicate', 'npm run check :: exit nope\nnpm run check :: exit invalid\n', 'ambiguous'],
      ['duplicate', 'npm run check :: exit 0\nnpm run check :: exit 0\n', 'ambiguous']
    ] as const;
    for (const [name, contents, expected] of cases) {
      const log = path.join(directory, `${name}.log`);
      fs.writeFileSync(log, contents);
      const report = collectEvidence({repo:'fixtures/passing-skill', log});
      assert.equal(report.checks['npm run check'], expected);
      assert.ok(checkEvidence(report).includes(`required release command did not pass: npm run check (${expected})`));
    }
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});
test('check command exits nonzero for incomplete evidence and zero for passing evidence', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-ci-evidence-test-'));
  try {
    for (const [name, report] of [
      ['incomplete', collectEvidence({repo:'fixtures/warning-skill'})],
      ['passing', collectEvidence({repo:'fixtures/passing-skill', log:'fixtures/release-check.log'})]
    ] as const) {
      fs.writeFileSync(path.join(directory, `${name}.json`), JSON.stringify(report));
    }
    const incomplete = spawnSync(process.execPath, ['dist/cli.js', 'check', path.join(directory, 'incomplete.json')]);
    const passing = spawnSync(process.execPath, ['dist/cli.js', 'check', path.join(directory, 'passing.json')]);
    assert.equal(incomplete.status, 1);
    assert.match(incomplete.stderr.toString(), /required npm script missing: check/);
    assert.equal(passing.status, 0);
    assert.match(passing.stdout.toString(), /evidence check passed/);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});
test('validates a collected evidence report round trip', () => {
  const collected = collectEvidence({repo:'fixtures/passing-skill', log:'fixtures/release-check.log'});
  assert.deepEqual(validateEvidenceReport(JSON.parse(JSON.stringify(collected))), collected);
});
test('rejects omitted evidence metadata, arrays, and maps deterministically', () => {
  const valid = collectEvidence({repo:'fixtures/passing-skill', log:'fixtures/release-check.log'});
  for (const field of ['repo', 'packageName', 'version', 'scripts', 'files', 'checks', 'warnings', 'missing', 'invalid'] as const) {
    const candidate: Record<string, unknown> = {...valid};
    delete candidate[field];
    assert.throws(
      () => validateEvidenceReport(candidate),
      new Error(`invalid evidence report: ${field} is required`)
    );
  }
});
test('rejects wrong evidence field and collection value types', () => {
  const valid = collectEvidence({repo:'fixtures/passing-skill', log:'fixtures/release-check.log'});
  const cases: Array<[Record<string, unknown>, string]> = [
    [{...valid, repo: 42}, 'repo must be a string'],
    [{...valid, scripts: 'check'}, 'scripts must be an array of strings'],
    [{...valid, files: [false]}, 'files must be an array of strings'],
    [{...valid, checks: []}, 'checks must be an object with string values'],
    [{...valid, checks: {'npm run check': 0}}, 'checks must be an object with string values'],
    [{...valid, warnings: [null]}, 'warnings must be an array of strings'],
    [{...valid, missing: {}}, 'missing must be an array of strings'],
    [{...valid, invalid: [1]}, 'invalid must be an array of strings']
  ];
  for (const [candidate, diagnostic] of cases) {
    assert.throws(() => validateEvidenceReport(candidate), new Error(`invalid evidence report: ${diagnostic}`));
  }
});
test('rejects evidence reports missing required release check keys', () => {
  const valid = collectEvidence({repo:'fixtures/passing-skill', log:'fixtures/release-check.log'});
  const checks = {...valid.checks};
  delete checks['npm test'];
  assert.throws(
    () => validateEvidenceReport({...valid, checks}),
    new Error('invalid evidence report: checks is missing required key: npm test')
  );
});
test('check command reports malformed evidence without incidental type errors', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-ci-evidence-schema-'));
  try {
    const file = path.join(directory, 'malformed.json');
    fs.writeFileSync(file, JSON.stringify({missing: []}));
    const result = spawnSync(process.execPath, ['dist/cli.js', 'check', file]);
    assert.equal(result.status, 1);
    assert.equal(result.stderr.toString(), 'invalid evidence report: repo is required\n');
    assert.doesNotMatch(result.stderr.toString(), /TypeError/);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});
