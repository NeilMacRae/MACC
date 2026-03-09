# Feature Specification: Prism Design System Migration & Navigation Redesign

**Feature Branch**: `003-prism-frontend-redesign`  
**Created**: 4 March 2026  
**Status**: Draft  
**Input**: User description: "I'd like to create a new feature branch to tackle upgrading the front end with the prism design components. This should be a full front end rework replacing all components with prism, as well as a re-design of the flow. Scenarios on the side bar should entirely be moved as an in page tab under the MACC chart side bar item (rename this to MACC modelling). I'd also like to move the targets components out of the Context side bar item and into an inpage tab under MACC modelling too - making so that users can move between creating an initiative, binding them into scenarios and viewing their path to target more seamlessly"

## User Scenarios & Testing

### User Story 1 - MACC Modelling Hub with Tabbed Workflow (Priority: P1)

A user navigates to the "MACC Modelling" item in the sidebar (formerly "MACC Chart"). They land on a page with multiple in-page tabs: **Initiatives**, **Scenarios**, and **Targets**. The user can freely switch between tabs without losing context, enabling a seamless workflow where they create initiatives, group them into scenarios, set reduction targets, and visualise the resulting MACC curve — all within a single cohesive workspace.

**Why this priority**: This is the core navigation redesign that delivers the primary user value — eliminating friction between the four most tightly coupled activities in the application. Without this, the remaining Prism styling work is cosmetic.

**Independent Test**: Can be fully tested by navigating to "MACC Modelling" in the sidebar and switching between all four tabs, verifying that each tab displays the correct content and that the user can complete a full workflow (create initiative → add to scenario → set target → view MACC chart) without leaving the page.

**Acceptance Scenarios**:

1. **Given** the user is on any page, **When** they click "MACC Modelling" in the sidebar, **Then** they see the MACC Modelling page with tabs for Initiatives, Scenarios, and Targets.
2. **Given** the user is on the MACC Modelling page, **When** they click each tab, **Then** the corresponding content loads in-page without a full page navigation.
3. **Given** the user creates a new initiative under the Initiatives tab, **When** they switch to the Scenarios tab, **Then** the newly created initiative is available for selection in scenario management.
4. **Given** the user sets a target under the Targets tab, **When** they switch to the Initiatives tab, **Then** the target line is displayed on the MACC chart within the Initiatives tab, reflecting the configured target.
5. **Given** the user is on the MACC Modelling page with the Scenarios tab active, **When** they refresh the browser, **Then** they return to the MACC Modelling page with the Scenarios tab restored (via URL state).

---

### User Story 2 - Prism Component Library Adoption (Priority: P2)

A user interacts with any part of the application and experiences a consistent, polished UI built with Prism design components. All custom-built Tailwind components (buttons, modals, tables, forms, badges, cards) are replaced with their Prism equivalents, providing a professional, accessible, and visually consistent experience across every page.

**Why this priority**: Establishes the visual foundation and component consistency across the entire application. Component migration can proceed page-by-page independently of the navigation restructuring — each page remains stable and functional throughout the migration.

**Independent Test**: Can be tested by navigating through every page and verifying that all interactive elements (buttons, form inputs, modals, tables, dropdowns) use Prism components where a suitable Prism component exists, and that any remaining custom-built components are visually consistent with the Prism design language. Tailwind utility classes used for layout and composition are permitted.

**Acceptance Scenarios**:

1. **Given** the user visits any page, **When** they interact with buttons, **Then** all buttons use Prism button components with consistent styling, sizing, and states (hover, active, disabled, loading).
2. **Given** the user opens any modal (create initiative, create scenario, add target), **When** the modal appears, **Then** it uses the Prism modal/dialog component with consistent overlay, animation, and close behaviour.
3. **Given** the user views any data table (initiatives, emissions, scenarios), **When** the table renders, **Then** it uses the Prism table component with consistent row styling, sorting indicators, and responsive behaviour.
4. **Given** the user fills out any form (context, targets, initiative creation), **When** they interact with form fields, **Then** all inputs, selects, textareas, and validation messages use Prism form components.

---

### User Story 3 - Simplified Sidebar Navigation (Priority: P3)

A user sees a cleaner, more focused sidebar with fewer items. "Scenarios" is no longer a separate sidebar entry (it now lives as a tab under MACC Modelling). The "Context" sidebar item no longer includes targets (targets have moved to MACC Modelling). The sidebar contains: **Emissions**, **MACC Modelling**, **Context**, and **Settings**.

**Why this priority**: Depends on the tabbed MACC Modelling hub (P1) being complete so that relocated content has a home before removal from the sidebar.

**Independent Test**: Can be tested by verifying the sidebar shows exactly four items, that clicking each navigates to the correct page, and that the previous "Scenarios" route redirects to the MACC Modelling page with the Scenarios tab active.

**Acceptance Scenarios**:

1. **Given** the user views the sidebar, **When** the page loads, **Then** they see exactly four navigation items: Emissions, MACC Modelling, Context, and Settings.
2. **Given** the user has bookmarked the old `/scenarios` URL, **When** they navigate to it, **Then** they are redirected to the MACC Modelling page with the Scenarios tab active.
3. **Given** the user clicks "Context" in the sidebar, **When** the Context page loads, **Then** it shows only the organisation profile — targets are no longer displayed on this page.

---

### User Story 4 - Prism Layout & Sidebar Shell (Priority: P4)

The application shell — sidebar, header, page layout — is rebuilt using Prism layout primitives. The sidebar uses Prism navigation components with proper active states, icons, and responsive behaviour. The page header uses Prism heading and breadcrumb components. The overall page structure uses Prism's layout grid or container components.

**Why this priority**: Provides the structural foundation for all pages but is lower priority than the functional navigation changes and individual component replacements.

**Independent Test**: Can be tested by verifying the sidebar, header, and page container use Prism components, respond correctly to different viewport sizes, and maintain consistent spacing and alignment.

**Acceptance Scenarios**:

1. **Given** the user views the application on a standard desktop viewport, **When** the page renders, **Then** the sidebar, header, and content area use Prism layout components with correct spacing and alignment.
2. **Given** the user views the sidebar, **When** they hover over or select navigation items, **Then** the active and hover states follow Prism design patterns.

---

### User Story 5 - Emissions Page Prism Rebuild (Priority: P5)

The Emissions page is rebuilt with Prism components. The emissions summary dashboard, scope breakdown chart, organisational hierarchy view, trend visualisations, and unit detail panels all use Prism card, chart container, and data display components.

**Why this priority**: The Emissions page is a standalone, read-heavy page that benefits from Prism's data display components but has no dependencies on the navigation restructuring.

**Independent Test**: Can be tested by navigating to the Emissions page and verifying all sections render with Prism components, data loads correctly, and charts display within Prism card/container components.

**Acceptance Scenarios**:

1. **Given** the user navigates to the Emissions page, **When** it loads, **Then** all dashboard cards, charts, and data panels use Prism components.
2. **Given** emissions data is available, **When** the user views scope breakdowns and trends, **Then** charts are rendered within Prism container components with consistent styling.

---

### User Story 6 - Context Page Prism Rebuild (Priority: P6)

The Context page (now containing only the organisation profile after targets have moved to MACC Modelling) is rebuilt with Prism form components. All form fields, validation messages, and save/cancel actions use Prism components.

**Why this priority**: The Context page is simpler after targets are removed and serves as a good candidate for a clean Prism form implementation.

**Independent Test**: Can be tested by navigating to the Context page and completing the organisation profile form, verifying all form elements use Prism components.

**Acceptance Scenarios**:

1. **Given** the user navigates to Context, **When** the page loads, **Then** the organisation profile form uses Prism form inputs, labels, validation, and action buttons.
2. **Given** the user submits the context form with invalid data, **When** validation errors appear, **Then** they use Prism's error message and form validation styling.

---

### Edge Cases

- What happens when the user navigates to the old `/scenarios` route directly? → Redirect to `/macc` with the Scenarios tab active.
- What happens when the user has deep-linked to a specific scenario? → Redirect to the Scenarios tab within MACC Modelling.
- What happens when the user is on the MACC Modelling page and the tab state is not in the URL? → Default to the Initiatives tab.
- How does the tabbed interface handle loading states when switching tabs? → Each tab manages its own loading state independently; switching tabs does not block the UI.
- What happens when context has not been set and the user visits the Targets tab? → The Targets tab displays an informational message guiding the user to complete their organisation context first, with a link to the Context page.

## Clarifications

### Session 2026-03-04

- Q: When the user visits `/macc` with a `?tab=` query parameter that's missing or has an unrecognized value, how should the app behave? → A: Normalize URL to `?tab=initiatives` and show the Initiatives tab.

- Q: For FR-015, what exact rule determines that organisation context is "not configured" for the Targets tab? → A: Context is considered not configured only when no OrganisationalContext record exists for the organisation (backend GET /context returns 404). When this is the case, the Targets tab shows an informational banner but remains fully functional — targets are stored directly against the organisation (not the context record) so they can be created and managed at any time.

## Requirements

### Functional Requirements

- **FR-001**: The sidebar MUST display exactly four navigation items: Emissions, MACC Modelling, Context, and Settings.
- **FR-002**: The "MACC Modelling" sidebar item MUST navigate to a page containing in-page tabs for Initiatives, Scenarios, and Targets.
- **FR-003**: Each tab within the MACC Modelling page MUST load its content in-page without triggering a full page navigation.
- **FR-004**: The active tab MUST be reflected in the URL so that browser back/forward navigation and direct linking work correctly.
- **FR-005**: The system MUST redirect requests to the old `/scenarios` route to the MACC Modelling page with the Scenarios tab active.
- **FR-006**: The Context page MUST display only the organisation profile — targets MUST NOT appear on the Context page.
- **FR-007**: The Targets tab under MACC Modelling MUST provide the same functionality currently available on the Context page for targets: viewing, creating, editing, and deleting targets.
- **FR-008**: All standard UI patterns MUST use `@ecoonline/prism-web-components-react` components where a suitable Prism component exists, including but not limited to: buttons, modals/dialogs, tables, form inputs, selects, badges, cards, and loading indicators. Where no Prism component is available, a custom component MUST be built following Prism design principles (spacing, typography, visual language, interaction patterns). Tailwind MAY continue to be used for layout composition around components.
- **FR-009**: The application shell (sidebar, header, page layout) MUST use Prism layout and navigation components.
- **FR-010**: All Prism components MUST maintain the existing application functionality — no features may be removed or broken during the migration.
- **FR-011**: The default tab when navigating to MACC Modelling (without a tab specified in the URL) MUST be the Initiatives tab. If the `?tab` query parameter is missing or has an unrecognized value, the application MUST normalize the URL to `?tab=initiatives` and display the Initiatives tab.
- **FR-012**: Tab switching MUST preserve form field values and selected entities within the current tab for the duration of the session. Open modals are dismissed on tab switch. Comparison panel selections and in-progress filtering states reset when leaving a tab.
- **FR-013**: The Initiatives tab MUST display the interactive MACC curve visualisation, AI-powered suggestions, and the initiative table with detail panels — consolidating all current MACCPage content into a single unified modelling workspace.
- **FR-014**: Scenario management (creating, editing, comparing scenarios, managing scenario initiatives) MUST be fully functional within the Scenarios tab.
- **FR-015**: The Targets tab MUST be fully available (create, view, edit, delete targets) regardless of whether an organisational context record exists. When no organisational context record exists (GET `/context` returns HTTP 404), the Targets tab MUST display an informational banner guiding users to set up their context (noting that context is used for AI-powered features), but this banner MUST NOT prevent target creation or management.
- **FR-016**: All UI components (Prism and custom) MUST meet WCAG 2.1 AA accessibility standards, including keyboard navigation and screen reader support.
- **FR-017**: The Prism migration MUST NOT increase the production bundle size by more than 50KB without documented justification and an optimization review prior to merge.

### Key Entities

- **Navigation Item**: A sidebar entry representing a top-level section of the application (Emissions, MACC Modelling, Context, Settings).
- **MACC Modelling Tab**: A sub-section within the MACC Modelling page (Initiatives, Scenarios, Targets) — each tab encapsulates a distinct but related activity.
- **Initiative**: A carbon reduction action with cost and abatement attributes, created and managed within the Initiatives tab.
- **Scenario**: A named collection of initiatives representing a potential reduction pathway, managed within the Scenarios tab.
- **Target**: An emission reduction goal with a target year and percentage, managed within the Targets tab and modelled independently of organisational context (associated directly with the organisation rather than the context profile).
- **MACC Chart**: The marginal abatement cost curve visualisation showing initiatives ordered by cost-effectiveness, displayed within the Initiatives tab.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete the full modelling workflow (create initiative → add to scenario → set target → view MACC chart) without navigating away from the MACC Modelling page.
- **SC-002**: All interactive UI elements across every page use `@ecoonline/prism-web-components-react` components where a suitable Prism component exists; any custom-built components follow Prism design principles and are visually consistent with the Prism design language.
- **SC-003**: The sidebar contains exactly four navigation items, reduced from the current five.
- **SC-004**: Tab content is visible and interactive (time-to-interactive) within 1 second of a tab click, assuming data has been previously fetched and cached during the session.
- **SC-005**: All existing features remain fully functional after the migration — no regression in capabilities for emissions viewing, initiative management, scenario management, target setting, context configuration, or MACC chart visualisation.
- **SC-006**: Direct URLs to each MACC Modelling tab work correctly (shareable/bookmarkable links).
- **SC-007**: Legacy routes (`/scenarios`) redirect correctly to the new tab-based location, preserving any bookmarks users may have.

## Assumptions

- **Prism design system** refers to `@ecoonline/prism-web-components-react` as mandated by the project constitution. This MUST be listed as a production dependency in `frontend/package.json`.
- Where `@ecoonline/prism-web-components-react` provides a suitable component, it MUST be used. Where no Prism equivalent exists, a custom component MAY be built provided it follows Prism design principles (spacing, typography, visual language, and interaction patterns) so the UI remains cohesive.
- The `emission_targets` table will be migrated to store targets directly under `organisations.id`, decoupled from `organisational_contexts`. This requires a backend Alembic migration, model update, and service layer change (delivered as plan Phase 0 before any frontend work begins). After this migration the target CRUD API endpoints (`/context/targets`) remain at the same paths — only the internal storage and authorization logic changes.
- The D3-based MACC chart visualisation will remain custom-built (wrapped in Prism container components) since Prism is unlikely to provide a specialised MACC chart component.
- The AI suggestions functionality continues to work as-is, with its UI components migrated to Prism equivalents.
- The existing data fetching layer (TanStack Query hooks) remains unchanged — only the presentation layer is affected.
- Tab state preservation (FR-012) applies to in-memory state during a single session; it does not persist across page refreshes (URL state handles tab selection on refresh, not form data).
- This feature MUST be delivered as a series of independently stable increments per Principle VII of the constitution — for example, the backend decoupling (Phase 0) first, then the navigation restructure (US1/US3), followed by per-page Prism component migration (US2/US4/US5/US6) — with the application remaining fully functional after each merged increment.
