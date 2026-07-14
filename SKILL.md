# Skill CI Evidence Skill

Use this skill when an agent needs to collect minimum CI and local verification evidence needed to review an agent-skill release candidate.

## Required Inputs

- Local repository or fixture path.
- Captured logs or JSON action records.
- Explicit approval before any external action or fixture rewrite.

## Side Effects

Default commands only read local files and write requested reports. Do not use this skill to publish, tag, merge, or call live connector APIs.

## Workflow

1. Run the planner against fixtures or logs.
2. Review JSON and Markdown output.
3. Run the check command.
4. Paste evidence into the release-candidate PR.

## Examples

```bash
skill-ci-evidence collect --repo fixtures/passing-skill --log fixtures/release-check.log --out .tmp/evidence.md --json .tmp/evidence.json
skill-ci-evidence check .tmp/evidence.json
```
