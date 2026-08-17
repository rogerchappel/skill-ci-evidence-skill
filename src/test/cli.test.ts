import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const cli = path.resolve('dist/cli.js');

function run(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], {encoding: 'utf8'});
}

test('rejects invalid collect arguments without consuming an option as a value', () => {
  for (const [args, diagnostic] of [
    [['collect', '--bogus', 'value'], 'unknown collect option: --bogus'],
    [['collect', 'fixtures/passing-skill'], 'unexpected positional argument: fixtures/passing-skill'],
    [['collect', '--repo'], 'missing value for collect option: --repo'],
    [['collect', '--repo', '--json', 'result.json'], 'missing value for collect option: --repo'],
    [['collect', '--repo', '.', '--repo', '.'], 'duplicate collect option: --repo']
  ] as const) {
    const result = run(...args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(diagnostic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(result.stderr, /Usage:/);
  }
});

test('rejects malformed check invocation', () => {
  for (const args of [
    ['check'],
    ['check', '--json'],
    ['check', 'one.json', 'two.json']
  ]) {
    const result = run(...args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /check/);
    assert.match(result.stderr, /Usage:/);
  }
});

test('collect preserves defaults and supports all output options', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-ci-cli-'));
  try {
    const markdown = path.join(directory, 'report.md');
    const json = path.join(directory, 'report.json');
    const stdout = execFileSync(process.execPath, [cli, 'collect', '--repo', 'fixtures/passing-skill', '--log', 'fixtures/release-check.log', '--out', markdown, '--json', json], {encoding: 'utf8'});
    assert.equal(stdout, '');
    assert.match(fs.readFileSync(markdown, 'utf8'), /passing-skill/);
    assert.equal(JSON.parse(fs.readFileSync(json, 'utf8')).packageName, 'passing-skill');

    const defaultOutput = execFileSync(process.execPath, [cli, 'collect'], {encoding: 'utf8'});
    assert.match(defaultOutput, /skill-ci-evidence-skill/);
  } finally {
    fs.rmSync(directory, {recursive: true});
  }
});

test('collect and check report wrong required path types', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-ci-cli-types-'));
  try {
    fs.cpSync('fixtures/passing-skill', directory, {recursive:true});
    fs.rmSync(path.join(directory, 'SKILL.md'));
    fs.mkdirSync(path.join(directory, 'SKILL.md'));
    const evidence = path.join(directory, 'evidence.json');
    const markdown = path.join(directory, 'evidence.md');
    execFileSync(process.execPath, [cli, 'collect', '--repo', directory, '--log', 'fixtures/release-check.log', '--out', markdown, '--json', evidence]);
    assert.match(fs.readFileSync(markdown, 'utf8'), /SKILL\.md \(expected regular file\)/);
    const checked = run('check', evidence);
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /required path invalid: SKILL\.md \(expected regular file\)/);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});

test('help documents accepted syntax', () => {
  const result = run('--help');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /collect \[--repo <path>\] \[--log <path>\] \[--out <path>\] \[--json <path>\]/);
  assert.match(result.stdout, /check <evidence\.json>/);
});
