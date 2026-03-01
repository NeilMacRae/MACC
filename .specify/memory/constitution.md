<!--
=== Sync Impact Report ===
Version change: 1.1.1 → 1.2.0
Modified principles: None
Added sections:
  - Principle VI: AI Model Configuration (MANDATORY: claude-sonnet-4-6 only)
  - Clarification: Claude model specification added to Session 2026-02-28
Removed sections: None
Technology Stack updates: None (AI model enforcement is principle-level)
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (no AI-specific guidance required)
  - .specify/templates/spec-template.md ✅ (no AI-specific guidance required)
  - .specify/templates/tasks-template.md ✅ (no AI-specific guidance required)
  - backend/src/integrations/openai_client.py ✅ UPDATED (ANTHROPIC_MODEL default set to "claude-sonnet-4-6" with validation)
  - backend/.env ✅ VERIFIED (ANTHROPIC_MODEL already set to "claude-sonnet-4-6")
Follow-up TODOs:
  - Backend restart required to load new model validation logic
  - Consider adding model validation tests to ensure compliance
  - Document model change rationale in research.md or relevant spec docs (if needed)
Rationale for MINOR version bump:
  - New principle (VI) added establishing AI model governance
  - Material guidance expansion: explicit model pinning requirement
  - No backward-incompatible changes (existing code can be updated to comply)
-->

# MACC Constitution

## Technology Stack (MANDATORY)

MACC is a **stand-alone application** that integrates with the main organizational Python application via APIs. AI-driven development is intentionally segmented to maintain isolation and reduce risk.

| Layer | Technology | Notes |
|-------|------------|-------|
| **Backend** | Python 3.11+ | FastAPI or similar async framework; aligns with org standard |
| **Frontend** | React 18+ | TypeScript required; functional components with hooks |
| **Design System** | EcoOnline patterns | Match existing app: sidebar nav, blue primary, clean forms/tables |
| **Database** | SQLite | Embedded database for simpler deployment and development |
| **Authentication** | JWT tokens | Stateless tokens for API authentication |
| **API Protocol** | REST (OpenAPI 3.x) | JSON payloads; versioned endpoints (`/api/v1/...`) |
| **Testing (Backend)** | pytest | pytest-asyncio for async tests; pytest-cov for coverage |
| **Testing (Frontend)** | Vitest + React Testing Library | Jest-compatible; avoid Enzyme |
| **Linting/Formatting** | Ruff (Python), ESLint + Prettier (React) | Pre-commit hooks enforced |
| **Type Checking** | mypy (Python), TypeScript strict mode | No `Any` or `any` without justification |
| **Deployment** | Local development (uvicorn + Vite) | Backend on :8000, frontend on :5173; Makefile convenience targets |
| **CI/CD** | GitHub Actions | Automated testing, linting, and deployment workflows |

**Rationale**: Aligning with organisational standards ensures knowledge transfer, shared tooling, and consistent hiring/onboarding across projects.

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

All code MUST meet these quality standards before merge:

- **Readability**: Code MUST be self-documenting with clear naming conventions; comments explain "why", not "what"
- **Consistency**: All code MUST follow the project's established style guide and linting rules; no exceptions without documented justification
- **Modularity**: Functions/methods MUST have a single responsibility; maximum cyclomatic complexity of 10 per function
- **Type Safety**: Explicit types MUST be used where the language supports them; avoid `any` or equivalent escape hatches
- **No Dead Code**: Unused imports, variables, and functions MUST be removed before merge
- **Error Handling**: All error paths MUST be explicitly handled; no swallowed exceptions without logging

**Rationale**: Consistent, readable code reduces cognitive load, accelerates onboarding, and minimizes defect introduction.

### II. Testing Standards

All features MUST include appropriate test coverage:

- **Unit Tests**: Business logic MUST have unit tests with ≥80% line coverage for new code
- **Contract Tests**: API endpoints and interfaces MUST have contract tests verifying request/response schemas
- **Integration Tests**: Cross-component interactions MUST have integration tests covering happy path and primary error scenarios
- **Test Independence**: Tests MUST be isolated and repeatable; no shared mutable state between tests
- **Test Naming**: Test names MUST describe the scenario and expected outcome (e.g., `test_login_with_invalid_password_returns_401`)
- **Test-First Preferred**: When practical, write failing tests before implementation (Red-Green-Refactor)

**Rationale**: Comprehensive testing catches regressions early and provides living documentation of expected behavior.

### III. User Experience Consistency

All user-facing features MUST maintain experience consistency:

- **Design System**: UI components MUST match EcoOnline design patterns (sidebar navigation, blue primary color, clean forms/tables); custom styles require explicit approval
- **Interaction Patterns**: Similar actions MUST behave consistently across the application (e.g., all forms validate the same way)
- **Error Messaging**: User-facing errors MUST be actionable and human-readable; no technical jargon or stack traces
- **Loading States**: All async operations MUST show appropriate loading indicators; no blank or frozen UI states
- **Accessibility**: UI MUST meet WCAG 2.1 AA standards; keyboard navigation and screen reader support required
- **Responsive Design**: UI MUST function correctly across supported viewport sizes and devices

**Rationale**: Consistent UX builds user trust and reduces support burden by making the application predictable and learnable.

### IV. Performance Requirements

All features MUST meet baseline performance standards:

- **Response Time**: API endpoints MUST respond within 200ms p95 under normal load; exceptions require documented justification
- **Initial Load**: Page/screen initial load MUST complete within 3 seconds on target network conditions
- **Memory Efficiency**: Features MUST not introduce memory leaks; background processes MUST clean up resources
- **Bundle Size**: Frontend additions MUST not increase bundle size by more than 50KB without optimization review
- **Database Queries**: N+1 queries are prohibited; queries MUST be optimized and indexed appropriately
- **Caching Strategy**: Repeated expensive operations MUST implement appropriate caching

**Rationale**: Performance directly impacts user satisfaction and system scalability; degradation compounds over time if not enforced.

### V. API Integration & Segmentation

MACC operates as an isolated service with controlled integration points:

- **API-First Design**: All communication with external systems MUST occur via versioned REST APIs; no direct database access to external systems
- **Contract-Driven**: OpenAPI specifications MUST be defined before implementation; changes require contract versioning
- **Authentication**: All API endpoints MUST require authentication using JWT tokens for stateless API-to-API communication
- **Rate Limiting**: Outbound API calls to external systems MUST implement rate limiting and exponential backoff
- **Fault Isolation**: Failures in external API calls MUST NOT crash the application; graceful degradation required
- **Data Boundaries**: MACC MUST NOT store sensitive data that belongs to the main application; reference by ID only
- **Audit Trail**: All cross-system API calls MUST be logged with correlation IDs for traceability

**Rationale**: Segmented AI-driven development reduces blast radius of changes, enables independent deployment, and maintains clear ownership boundaries.

### VI. AI Model Configuration

All AI/LLM integrations MUST use standardized, tested model configurations:

- **Model Pin**: The ONLY valid Claude model is `claude-sonnet-4` (versioned as `claude-sonnet-4-6` in code); no other models are permitted
- **No Model Variance**: Code, documentation, tests, and environment configurations MUST all reference the same pinned model; inconsistencies are prohibited
- **Explicit Configuration**: Model identifiers MUST be explicitly set in code defaults and environment variables; implicit defaults are not allowed
- **Version Stability**: Model version changes require constitution amendment and full regression testing before deployment
- **Error Handling**: Model availability errors MUST fail fast with clear error messages indicating the required model
- **Documentation**: All AI integration documentation MUST specify the exact model identifier and reasoning for the choice

**Rationale**: Model specification inconsistencies caused significant debugging issues for development agents. A single, enforced model standard eliminates configuration drift and ensures reproducible AI behavior across all environments.

## Clarifications

### Session 2026-02-28

- Q: Which database technology should MACC use? → A: SQLite
- Q: What authentication method should be used for API endpoints? → A: JWT tokens
- Q: What design system should the React frontend use? → A: Match existing application (EcoOnline design patterns)
- Q: What deployment environment should MACC use? → A: Local development (uvicorn + Vite dev servers)
- Q: Which CI/CD platform should be used? → A: GitHub Actions
- Q: What Claude model should be used for AI features? → A: `claude-sonnet-4` (versioned as `claude-sonnet-4-6`) - no other models permitted

## Quality Gates

All changes MUST pass these gates before merge:

1. **Automated Checks**: Linting (Ruff/ESLint), type checking (mypy/TypeScript), and all tests pass in GitHub Actions CI
2. **Code Review**: At least one approving review from a qualified reviewer
3. **Performance Verification**: No regression in key performance metrics (measured or justified)
4. **Accessibility Check**: UI changes verified against accessibility standards
5. **Documentation**: Public APIs and significant behavior changes documented
6. **API Contract Validation**: OpenAPI spec updated and validated for any endpoint changes

## Project Structure

MACC follows a web application structure with separate backend and frontend:

```
backend/
├── src/
│   ├── api/           # FastAPI routes and schemas
│   ├── models/        # Pydantic models and database entities
│   ├── services/      # Business logic layer
│   └── integrations/  # External API clients
└── tests/
    ├── unit/
    ├── integration/
    └── contract/

frontend/
├── src/
│   ├── components/    # Reusable React components
│   ├── pages/         # Route-level components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API client and data fetching
│   └── types/         # TypeScript type definitions
└── tests/
```

## Development Workflow

1. **Branch Strategy**: Feature branches from main; PRs required for all changes
2. **Commit Messages**: Follow conventional commits format (`feat:`, `fix:`, `docs:`, etc.)
3. **PR Scope**: One logical change per PR; large changes split into reviewable increments
4. **Review Turnaround**: Reviews completed within 24 business hours
5. **Merge Requirements**: Squash merge to main; clean, descriptive commit message

## Governance

This constitution is the authoritative source for development standards in MACC.

- **Precedence**: Constitution requirements supersede informal practices or individual preferences
- **Compliance**: All PRs and code reviews MUST verify compliance with these principles
- **Amendments**: Changes to this constitution require:
  1. Written proposal documenting the change and rationale
  2. Review period of at least 48 hours
  3. Approval from project maintainers
  4. Version increment following semantic versioning (MAJOR.MINOR.PATCH)
- **Exceptions**: Temporary exceptions MUST be documented with a remediation timeline
- **Versioning Policy**:
  - MAJOR: Principle removal or backward-incompatible governance changes
  - MINOR: New principles added or material guidance expansion
  - PATCH: Clarifications, typo fixes, non-semantic refinements

**Version**: 1.2.0 | **Ratified**: 2026-02-28 | **Last Amended**: 2026-02-28
