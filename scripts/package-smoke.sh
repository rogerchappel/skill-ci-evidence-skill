#!/usr/bin/env bash
set -euo pipefail

package_dir="$(mktemp -d)"
trap 'rm -rf "$package_dir"' EXIT

package_file="$(npm pack --pack-destination "$package_dir" | tail -n 1)"
consumer_dir="$package_dir/consumer"
mkdir "$consumer_dir"
cd "$consumer_dir"
npm init --yes >/dev/null
npm install --ignore-scripts "$package_dir/$package_file" >/dev/null
npx --no-install skill-ci-evidence collect \
  --repo node_modules/skill-ci-evidence-skill/fixtures/passing-skill \
  --log node_modules/skill-ci-evidence-skill/fixtures/release-check.log \
  --json evidence.json
npx --no-install skill-ci-evidence check evidence.json
