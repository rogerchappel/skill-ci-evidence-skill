# External user feedback

This release candidate has not yet been validated with external users. Do not mark feedback as collected until a real participant has reviewed the package and their response has been recorded with consent.

## Collection criteria

Invite people who work with agent-skill CI or release evidence, rather than relying only on maintainers. Ask each participant to try the documented fixture-backed workflow and comment on:

1. Whether the purpose and no-external-writes boundary are clear.
2. Whether they can install/run the CLI and interpret its output without help.
3. Which evidence is missing, confusing, or unnecessarily burdensome for a release review.
4. Any blocking usability or correctness concern, with the command/input and observed result when available.

Record the date, participant role (not personal contact details), package version or commit, scenario tested, concise feedback, and disposition (accepted, deferred, or not actionable) with rationale. Do not record secrets or sensitive personal information. Treat one response as qualitative feedback, not proof of broad adoption; report the number and relevant limitations of responses.

## Local feedback log

Maintain `docs/FEEDBACK_LOG.md` locally as a private working record; do not commit participant-identifying details. Add one entry per response using the template below, and only publish an anonymized summary if participants have consented.

```text
Date:
Version/commit:
Participant role:
Scenario:
Feedback:
Disposition and rationale:
```

No external service, account, or write is required by this process. The log is a manual local artifact and should not be represented as collected feedback until it contains a genuine response.
