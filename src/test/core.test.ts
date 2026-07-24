import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { collectEvidence, checkEvidence } from '../index.js';
test('collects passing repo evidence', () => { const report = collectEvidence({repo:'fixtures/passing-skill', log:'fixtures/release-check.log'}); assert.equal(report.packageName, 'passing-skill'); assert.equal(report.missing.length, 0); assert.equal(checkEvidence(report).length, 0); });
test('flags incomplete package evidence', () => { const report = collectEvidence({repo:'fixtures/failing-skill'}); assert.ok(report.missing.includes('SKILL.md')); assert.ok(checkEvidence(report).length > 0); });
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
      'required release command not observed: npm run check',
      'required release command not observed: npm test',
      'required release command not observed: npm run smoke',
      'required release command not observed: npm pack --dry-run'
    ]
  );
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
