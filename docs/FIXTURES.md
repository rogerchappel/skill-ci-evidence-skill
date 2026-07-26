# Fixtures

Fixtures cover passing, warning, and risky cases. They are intentionally small so agent builders can audit the expected behavior quickly.

The passing fixture also demonstrates package directory inclusion: its `docs`
entry includes both required documentation files. Regression tests construct
temporary fixtures for declared-but-nonexistent paths so invalid source files
are never added to the published fixture package.
