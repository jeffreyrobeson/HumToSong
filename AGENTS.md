---
description: 
alwaysApply: true
---

# AGENTS.md


## Tech Stack

**Frontend:** Bun, React, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand

**Backend:** Python 3.12+, FastAPI, Google ADK, SQLite, Pydantic

## Structure

- `frontend/` - React + Vite frontend
- `backend/` - FastAPI backend
- `docs/` - Documentation (tech-spec.md, prd.md)

## Before You Code

- Read the nearest AGENTS.md before modifying code.

## Development

```bash
just dev-frontend  # Run frontend dev server
just dev-backend   # Run backend dev server
just up            # Run both (Docker)
just down          # Stop Docker
```

## Code Style

- Frontend: Biome enforces formatting and linting.
- Backend: Ruff for linting/formatting, ty for type checking.
- Use strong typing; avoid `Any` in Python and `any` in TypeScript.
- Write self-documenting code; comment only intent.
- Follow TDD: red → green → refactor.
- Use implicit namespace packages (no `__init__.py`).

## Code Submission

Run CI before submitting:

```bash
just ci   # Run all checks (lint, typecheck, security, env-check, test)
just fix  # Fix all (format + lint)
```

## Branch Naming

Use conventional prefixes for branch names:

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks
