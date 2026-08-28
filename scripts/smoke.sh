#!/usr/bin/env bash
set -euo pipefail
rm -rf .tmp
mkdir -p .tmp
node dist/cli.js collect --repo fixtures/passing-skill --log fixtures/release-check.log --out .tmp/evidence.md --json .tmp/evidence.json
node dist/cli.js check .tmp/evidence.json
