import test from 'node:test'; import assert from 'node:assert/strict';
import { collectEvidence, checkEvidence } from '../index.js';
test('collects passing repo evidence', () => { const report = collectEvidence({repo:'fixtures/passing-skill', log:'fixtures/release-check.log'}); assert.equal(report.packageName, 'passing-skill'); assert.equal(report.missing.length, 0); assert.equal(checkEvidence(report).length, 0); });
test('flags incomplete package evidence', () => { const report = collectEvidence({repo:'fixtures/failing-skill'}); assert.ok(report.missing.includes('SKILL.md')); assert.ok(checkEvidence(report).length > 0); });
