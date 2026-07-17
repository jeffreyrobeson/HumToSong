# LLL (Life Live Loop) - Development Commands

# Run frontend dev server
dev-frontend:
    cd frontend && bun run dev

# Run backend dev server
dev-backend:
    cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 9009

# Run both dev servers (requires two terminals, or use Docker)
dev:
    @echo "Run 'just dev-frontend' and 'just dev-backend' in separate terminals"

# Frontend commands
install-frontend:
    cd frontend && bun install

lint-frontend:
    cd frontend && bun run lint

format-frontend:
    cd frontend && bun run format

typecheck-frontend:
    cd frontend && bun run typecheck

test-frontend:
    cd frontend && bun run test

# Backend commands
install-backend:
    cd backend && uv sync

lint-backend:
    cd backend && uv run ruff check .

format-backend:
    cd backend && uv run ruff format .

typecheck-backend:
    cd backend && uv run ty check

test-backend:
    cd backend && uv run pytest

# Fix all (format + lint)
fix:
    cd frontend && bun run format && bun run lint:fix
    cd backend && uv run ruff format . && uv run ruff check --fix .

# CI: Run all checks
ci: lint-frontend typecheck-frontend lint-backend typecheck-backend test-backend
    @echo "All checks passed!"
