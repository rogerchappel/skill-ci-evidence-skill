# Skill CI Evidence Skill

Collects local release-candidate evidence for agent-skill packages.

## Quickstart

```bash
npm install
npm run build
npm exec -- skill-ci-evidence collect --repo fixtures/passing-skill --log fixtures/release-check.log --out .tmp/evidence.md --json .tmp/evidence.json
npm exec -- skill-ci-evidence check .tmp/evidence.json
```

`collect` accepts `--repo <path>` (default: the current directory),
`--log <path>`, `--out <path>`, and `--json <path>`. Options require a value;
unknown options, duplicate options, and positional arguments are rejected.
`check` accepts exactly one positional evidence JSON path. Run
`skill-ci-evidence --help` to print the accepted syntax.

`check` fails unless the report contains the required paths, the `check`,
`test`, and `smoke` package scripts, and successful outcomes for all four
release commands: `npm run check`, `npm test`, `npm run smoke`, and
`npm pack --dry-run`.

Required paths are checked on disk. Listing a missing path in `package.json`
`files` does not satisfy that check; package inclusion is reported separately
as a warning, with parent directory entries such as `docs` covering their
contents.

Release logs use one exact record per command:

```text
npm run check :: exit 0
```

The command must begin the line and the decimal exit code must end it. Exit
zero passes. Nonzero, missing, malformed, mentioned in other text, or duplicate
outcomes fail closed with the outcome in the diagnostic.

## Library

Import from `skill-ci-evidence-skill` to build local-first automation around the same deterministic planner.

## Safety Notes

- No live connector calls.
- No credential reads.
- No publishing, tagging, or release creation.
- Treat generated Markdown and JSON as review evidence, not execution approval.

## Limitations

V1 uses conservative heuristics and fixture inputs. Provider-specific state should still be checked by a human before risky external actions.
