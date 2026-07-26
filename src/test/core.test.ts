import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { collectEvidence, checkEvidence } from '../index.js';
test('collects passing repo evidence', () => { const report = collectEvidence({repo:'fixtures/passing-skill', log:'fixtures/release-check.log'}); assert.equal(report.packageName, 'passing-skill'); assert.equal(report.missing.length, 0); assert.equal(checkEvidence(report).length, 0); });
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
test('rejects failed, misleading, and duplicate command outcomes', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-ci-evidence-logs-'));
  try {
    const cases = [
      ['failed', 'npm run check :: exit 1\n', 'failed'],
      ['mention', 'next run: npm run check :: exit 0\n', 'not observed'],
      ['incomplete', 'npm run check PASS\n', 'not observed'],
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
