# Examples

```bash
npm exec -- skill-ci-evidence collect --repo fixtures/passing-skill --log fixtures/release-check.log --out .tmp/evidence.md --json .tmp/evidence.json
npm exec -- skill-ci-evidence check .tmp/evidence.json
```

Reports are designed for release-candidate PR bodies and agent handoffs.
