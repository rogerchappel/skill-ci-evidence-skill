#!/usr/bin/env bash
set -euo pipefail
rm -rf .tmp
mkdir -p .tmp
npm exec -- skill-ci-evidence collect --repo fixtures/passing-skill --log fixtures/release-check.log --out .tmp/evidence.md --json .tmp/evidence.json
npm exec -- skill-ci-evidence check .tmp/evidence.json
