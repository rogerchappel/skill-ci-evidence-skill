# Changelog

## Unreleased

- Validate the complete evidence-report JSON shape at the library and CLI
  boundary with deterministic, field-specific errors.
- Require release-evidence source paths to exist on disk, independently of
  package inclusion declarations.
- Warn when required source paths are not included by `package.json` `files`.

## 0.1.0

- Initial public release candidate.
- Local-first CLI, library, fixtures, tests, and skill documentation.
- Publish only the CLI and library build output; compile tests into a temporary test directory and verify the packed runtime allowlist.
