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

for case_name in failed mention incomplete; do
  case "$case_name" in
    failed) printf '%s\n' 'npm run check :: exit 2' > "$case_name.log" ;;
    mention) printf '%s\n' 'expected: npm run check :: exit 0' > "$case_name.log" ;;
    incomplete) printf '%s\n' 'npm run check PASS' > "$case_name.log" ;;
  esac
  npx --no-install skill-ci-evidence collect \
    --repo node_modules/skill-ci-evidence-skill/fixtures/passing-skill \
    --log "$case_name.log" \
    --json "$case_name.json"
  if npx --no-install skill-ci-evidence check "$case_name.json" >"$case_name.out" 2>"$case_name.err"; then
    echo "installed CLI accepted $case_name evidence" >&2
    exit 1
  fi
  grep -F 'required release command did not pass: npm run check' "$case_name.err"
done
