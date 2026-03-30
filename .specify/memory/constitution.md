<!--
=== Sync Impact Report ===
Version change: 1.4.0 → 1.5.0
Modified principles: None renamed or redefined
Added sections:
  - Principle VII: Iterative Delivery & Application Stability
  - Clarifications: Session 2026-03-04 (iterative delivery)
Removed sections: None
Templates requiring updates:
  - .specify/templates/spec-template.md ✅ updated — removed MVP
    framing from user story guidance comment
  - .specify/templates/tasks-template.md ✅ updated — replaced MVP
    language with iterative/stability terminology throughout
  - .specify/templates/plan-template.md ✅ (no changes needed;
    plan template has no MVP references)
Follow-up TODOs: None
Rationale for MINOR version bump:
  - New principle (VII) added — material governance expansion
  - No principles removed; no backward-incompatible changes
  - Templates updated to align with new principle
-->

# MACC Constitution

## Technology Stack (MANDATORY)

MACC is a **stand-alone application** that integrates with the main organizational Python application via APIs. AI-driven development is intentionally segmented to maintain isolation and reduce risk.

| Layer | Technology | Notes |
|-------|------------|-------|
| **Backend** | Python 3.11+ | FastAPI or similar async framework; aligns with org standard |
| **Frontend** | React 18+ | TypeScript required; functional components with hooks |
| **Design System** | EcoOnline patterns | Match existing app: sidebar nav, blue primary, clean forms/tables |
| **UI Components** | @ecoonline/prism-web-components-react | MANDATORY for all frontend work; prefer Prism components first; see Principle III |
| **Database** | SQLite | Embedded database for simpler deployment and development |
| **Authentication** | JWT tokens | Stateless tokens for API authentication |
| **API Protocol** | REST (OpenAPI 3.x) | JSON payloads; versioned endpoints (`/api/v1/...`) |
| **Testing (Backend)** | pytest | pytest-asyncio for async tests; pytest-cov for 100% unit coverage |
| **Testing (Frontend)** | Vitest + React Testing Library | Jest-compatible; 100% unit coverage; avoid Enzyme |
| **Testing (E2E)** | Playwright | Frontend regression test pack; replaces manual/traffic-based validation |
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

### II. Testing Strategy — TDD & BDD (NON-NEGOTIABLE)

All features MUST follow Test-Driven Development (TDD) and
Behaviour-Driven Development (BDD) disciplines:

#### TDD — Red-Green-Refactor (MANDATORY)

- **Test-First**: Failing tests MUST be written *before* any
  production code; implementation proceeds only to make those
  tests pass
- **Red-Green-Refactor cycle**: (1) Write a failing test (Red),
  (2) Write the minimal code to pass (Green), (3) Refactor while
  keeping tests green — this cycle MUST NOT be skipped
- **No Code Without a Test**: Every function, method, and branch
  MUST have a corresponding test; untested code MUST NOT be merged

#### BDD — Acceptance Criteria

- **Given/When/Then**: All user stories MUST define acceptance
  scenarios using Given/When/Then format in spec documents
- **Scenario Coverage**: Each acceptance scenario MUST map to at
  least one automated test (contract, integration, or E2E)
- **Living Documentation**: Test names and descriptions MUST read
  as behaviour specifications
  (e.g., `test_user_can_add_emission_source_and_see_updated_total`)

#### Coverage Requirements (MANDATORY)

- **Unit Test Coverage**: All backend and frontend code MUST
  achieve **100% line coverage** for unit tests; builds MUST fail
  if coverage drops below this threshold
 - **Coverage Scope**: Coverage requirements apply to
  project-owned production code; third-party libraries, generated
  code, and tooling configuration files are excluded unless
  explicitly opted in
- **Contract Tests**: API endpoints and interfaces MUST have
  contract tests verifying request/response schemas against
  OpenAPI specifications
- **Integration Tests**: Cross-component interactions MUST have
  integration tests covering happy path and primary error scenarios

#### Playwright Regression Test Pack (MANDATORY)

- **E2E Regression Suite**: A Playwright test pack MUST exist for
  all frontend user journeys; this is the primary mechanism for
  catching regressions — the project MUST NOT rely on manual
  testing or web-traffic monitoring
- **Story-Level Coverage**: Every user story MUST have at least one
  Playwright test exercising the full journey end-to-end
- **CI Gate**: Playwright tests MUST pass in CI before merge; no
  exceptions without a documented remediation timeline
- **Test Data Isolation**: Each Playwright test MUST set up and
  tear down its own data; tests MUST be independently runnable
- **Visual Regression**: Where practical, Playwright visual
  comparison snapshots SHOULD be used for UI-critical screens

#### General Test Discipline

- **Test Independence**: Tests MUST be isolated and repeatable; no
  shared mutable state between tests
- **Test Naming**: Test names MUST describe the scenario and
  expected outcome
  (e.g., `test_login_with_invalid_password_returns_401`)
 - **Determinism**: Flaky tests MUST be fixed or quarantined as a
  priority; flaky tests MUST NOT be ignored or skipped long-term

**Rationale**: AI-driven development agents introduce changes at
high velocity. TDD ensures every change is specification-backed,
100% unit coverage eliminates blind spots, BDD keeps tests aligned
with user intent, and a Playwright regression pack provides an
automated safety net that catches UI and integration regressions
without relying on production traffic or manual QA.

### III. User Experience Consistency (NON-NEGOTIABLE)

All user-facing features MUST maintain experience consistency:

- **Design System**: UI components MUST match EcoOnline design patterns (sidebar navigation, blue primary color, clean forms/tables); custom styles require explicit approval
- **Interaction Patterns**: Similar actions MUST behave consistently across the application (e.g., all forms validate the same way)
- **Error Messaging**: User-facing errors MUST be actionable and human-readable; no technical jargon or stack traces
- **Loading States**: All async operations MUST show appropriate loading indicators; no blank or frozen UI states
- **Accessibility**: UI MUST meet WCAG 2.1 AA standards; keyboard navigation and screen reader support required
- **Responsive Design**: UI MUST function correctly across supported viewport sizes and devices

#### Component Library Policy — Prism (MANDATORY)

All frontend development MUST use `@ecoonline/prism-web-components-react`
as the primary component library:

- **Prism-First**: When building any UI element, developers MUST
  first check whether a suitable component exists in
  `@ecoonline/prism-web-components-react`. If a Prism component
  can fulfil the requirement, it MUST be used — no custom
  alternatives are permitted
- **Custom Components (Fallback Only)**: If no acceptable Prism
  component exists for the task, a new custom component MAY be
  created, but it MUST borrow the design principles, visual
  language, spacing, typography, and interaction patterns of the
  existing Prism components so that the UI remains cohesive
- **No Competing Libraries**: Third-party UI component libraries
  (e.g., Material UI, Chakra, Ant Design, shadcn/ui) MUST NOT be
  introduced; the Prism library plus Prism-aligned custom
  components are the only permitted sources of UI primitives
 - **Prism Composition Preferred**: Prism components MAY be wrapped
  or composed into higher-level feature components; this is
  PREFERRED over creating new primitive widgets from scratch when
  a Prism primitive can satisfy the requirement
 - **Layout & Utilities**: Utility CSS frameworks (e.g., Tailwind)
  MAY be used for layout and composition around Prism components,
  but MUST NOT be used to create visually competing component
  libraries or off-brand UI primitives
- **Dependency Management**: `@ecoonline/prism-web-components-react`
  MUST be listed as a production dependency in
  `frontend/package.json`; version updates require regression
  testing before merge
- **Documentation**: When a custom component is created because no
  Prism equivalent exists, the PR description MUST document which
  Prism design principles were followed and why a custom component
  was necessary

**Rationale**: Consistent UX builds user trust and reduces support
burden by making the application predictable and learnable. Using
a single, organisation-standard component library eliminates
visual inconsistency, reduces bundle size, and ensures MACC aligns
with the broader EcoOnline product family.

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

### VII. Iterative Delivery & Application Stability (NON-NEGOTIABLE)

All features MUST be delivered iteratively with application
stability as the primary constraint:

- **Incremental Delivery**: Features MUST be broken into
  independently deliverable increments; each increment MUST leave
  the application in a fully functional, stable state
- **No Big-Bang Releases**: Large features MUST be decomposed into
  smaller, reviewable, and testable changes; multi-week monolithic
  branches are prohibited without an explicit decomposition plan
- **Stability First**: No increment may introduce regressions in
  existing functionality; the application MUST remain fully
  operational after every merge to main
- **Regression Safety Net**: Before any increment is merged, all
  existing tests (unit, integration, contract, and Playwright E2E)
  MUST pass; new functionality MUST include its own tests
- **Feature Flags (When Appropriate)**: Partially complete features
  that span multiple increments SHOULD use feature flags or
  conditional rendering to avoid exposing incomplete functionality
  to users
- **Rollback Readiness**: Each increment MUST be independently
  revertable without cascading failures across the application

**Rationale**: The product has moved beyond its initial MVP phase.
Stability and reliability are now paramount. Iterative delivery
ensures continuous progress without jeopardising the production
experience for existing users.

## Clarifications

### Session 2026-02-28

- Q: Which database technology should MACC use? → A: SQLite
- Q: What authentication method should be used for API endpoints? → A: JWT tokens
- Q: What design system should the React frontend use? → A: Match existing application (EcoOnline design patterns)
- Q: What deployment environment should MACC use? → A: Local development (uvicorn + Vite dev servers)
- Q: Which CI/CD platform should be used? → A: GitHub Actions
- Q: What Claude model should be used for AI features? → A: `claude-sonnet-4` (versioned as `claude-sonnet-4-6`) - no other models permitted

### Session 2026-03-01

- Q: What testing methodology should be followed? → A: TDD (Red-Green-Refactor) and BDD (Given/When/Then acceptance criteria) — both mandatory
- Q: What unit test coverage threshold is required? → A: 100% line coverage for both backend and frontend; builds MUST fail below threshold
- Q: How should frontend regressions be caught? → A: Playwright E2E regression test pack — NOT web traffic or manual QA
- Q: When should Playwright tests run? → A: In CI before every merge; must pass to merge

### Session 2026-03-04

- Q: What UI component library should the frontend use? → A: `@ecoonline/prism-web-components-react` — mandatory for all frontend work
- Q: What if Prism does not have a component we need? → A: Create a custom component that follows Prism design principles (spacing, typography, visual language, interaction patterns)
- Q: Can other UI libraries (MUI, Chakra, etc.) be used? → A: No; Prism plus Prism-aligned custom components are the only permitted sources
 - Q: Can Tailwind/utility CSS be used with Prism? → A: Yes, for layout and composition around Prism components, but not to create competing UI primitives
 - Q: What does the 100% coverage requirement apply to? → A: Project-owned production code (excluding third-party, generated, and tooling config code by default)

### Session 2026-03-04 (iterative delivery)

- Q: Is the project still in MVP phase? → A: No; the MVP has been delivered. Development now follows iterative delivery with application stability as the primary constraint
- Q: How should features be delivered? → A: Incrementally — each increment MUST leave the application fully functional and stable; no big-bang releases
- Q: What takes precedence: new feature velocity or application stability? → A: Application stability; no increment may introduce regressions

## Quality Gates

All changes MUST pass these gates before merge:

1. **Automated Checks**: Linting (Ruff/ESLint), type checking (mypy/TypeScript), and all tests pass in GitHub Actions CI
2. **Unit Test Coverage**: Backend and frontend unit test coverage MUST be 100%; CI MUST fail on any coverage drop
3. **Playwright Regression**: All Playwright E2E tests MUST pass; new user stories MUST include corresponding Playwright tests
4. **Code Review**: At least one approving review from a qualified reviewer
5. **Performance Verification**: No regression in key performance metrics (measured or justified)
6. **Accessibility Check**: UI changes verified against accessibility standards
7. **Documentation**: Public APIs and significant behavior changes documented
8. **API Contract Validation**: OpenAPI spec updated and validated for any endpoint changes

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
├── tests/             # Vitest unit/component tests
└── e2e/               # Playwright regression test pack
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

**Version**: 1.5.0 | **Ratified**: 2026-02-28 | **Last Amended**: 2026-03-04
