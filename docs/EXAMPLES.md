# Examples

```bash
npm exec -- skill-ci-evidence collect --repo fixtures/passing-skill --log fixtures/release-check.log --out .tmp/evidence.md --json .tmp/evidence.json
npm exec -- skill-ci-evidence check .tmp/evidence.json
```

Reports are designed for release-candidate PR bodies and agent handoffs.
The collector verifies required source paths on disk independently from the
package's `files` allowlist. A declared but nonexistent file or directory is
reported under `missing`; an existing path excluded from the package is
reported under `warnings`.

The log is machine-readable evidence, with exactly one outcome line for each
required command:

```text
npm run check :: exit 0
npm test :: exit 0
npm run smoke :: exit 0
npm pack --dry-run :: exit 0
```

Each command must start its line and use ` :: exit <decimal-code>` with nothing
after the code. Only exit code `0` passes. A nonzero code, informal `PASS` text,
a command mentioned inside another message, a missing line, or multiple outcome
lines for one command is rejected.
