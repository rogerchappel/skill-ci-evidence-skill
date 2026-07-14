# Skill CI Evidence Skill

Collects local release-candidate evidence for agent-skill packages.

## Quickstart

```bash
npm install
npm run build
skill-ci-evidence collect --repo fixtures/passing-skill --log fixtures/release-check.log --out .tmp/evidence.md --json .tmp/evidence.json
skill-ci-evidence check .tmp/evidence.json
```

## Library

Import from `skill-ci-evidence-skill` to build local-first automation around the same deterministic planner.

## Safety Notes

- No live connector calls.
- No credential reads.
- No publishing, tagging, or release creation.
- Treat generated Markdown and JSON as review evidence, not execution approval.

## Limitations

V1 uses conservative heuristics and fixture inputs. Provider-specific state should still be checked by a human before risky external actions.
