# Feature Specification: Marginal Abatement Cost Curve Modelling

**Feature Branch**: `001-macc-modelling`  
**Created**: 2026-02-28  
**Status**: Draft  
**Input**: User description: "Enable sustainability experts to understand how they can reduce organisational emissions through Marginal Abatement Cost Curve modelling. Load emissions data from core application, capture organisational context for AI agent, view emissions profile across scopes and org hierarchy, define custom or AI-suggested abatement initiatives."

## Clarifications

### Session 2026-02-28

- Q: For seed/sample data hierarchy depth, should we use consistent depth or mixed depth by branch? → A: Mixed depth by branch (manufacturing deeper; sales shallower)
- Q: For seed/sample emissions records, how many months of history should we generate? → A: 36 months (three years)
- Q: For seeded company geography, which countries should be represented for UK/Nordics/North America operations? → A: UK + NO/SE/FI/DK + US/CA
- Q: For the seeded fictional company, what should be the home/primary currency? → A: GBP
- Q: For seeded emissions, what overall scope mix should we aim for? → A: Scope 3 dominant (70% S3 / 20% S2 / 10% S1)
- Q: Should initiative cost be a single total or split into CapEx and OpEx? → A: CapEx (one-time, always positive) + OpEx annual (positive = ongoing cost, negative = ongoing saving). Lifecycle cost formula: (capex + opex_annual × lifespan_years) / co2e_reduction_annual_tonnes. Replaces cost_eur and annual_saving_eur.
- Q: Should emission source selection be a flat checklist or guided cascade? → A: Guided cascade: scope → question_group → question → activity → company units. One activity per initiative, multiple company units allowed. Source selection appears after status, before cost inputs. Contextual emissions data shown for selected activity+units.
- Q: Should reduction exceeding source total be a hard block or soft warning? → A: Yellow warning banner (non-blocking). Source data may be incorrect; user should not be prevented from inputting values.
- Q: What currency should be used? → A: GBP (£) throughout. All field names use _gbp suffix.
- Q: Should lifespan_years be required for the lifecycle cost formula? → A: Required with default of 10 years (editable by user).
- Q: Should co2e_reduction_tonnes represent annual or total reduction? → A: Annual. Field renamed to co2e_reduction_annual_tonnes for clarity. UI label: "Annual CO₂e reduction (tonnes/year)".
- Q: Should payback_years be a user input or computed? → A: Computed from capex / |opex_annual| when OpEx is negative (saving); displayed as N/A when OpEx ≥ 0. Not a user input.
 - Q: When requesting AI suggestions, should the system assume a default intent or ask the user? → A: Ask the user to choose between cost-focused and impact-focused modes in the suggestion request flow.
 - Q: When accepting an AI suggestion, should it automatically be added to a scenario by default? → A: No. Accepted AI suggestions create global initiatives by default; adding to scenarios is an optional follow-up action.
 - Q: What should happen if the AI cannot find any suggestions that fully satisfy current data and constraints? → A: Softly relax constraints and still return low-confidence suggestions, clearly flagging their confidence/limitations so users can discard them if unsuitable.
 - Q: Can AI suggestions represent multi-activity programmes, and if so how should they map to initiatives? → A: Yes, but accepted suggestions must be broken down into per-activity initiatives with valid, per-activity cost/saving and emissions abatement figures.
 - Q: Where should AI suggestions live in the UI — as a separate page or within the initiative creation flow? → A: Within the "New Initiative" flow on the MACC page. When the user clicks "New Initiative", they choose between creating one manually or asking the AI agent to suggest initiatives. This keeps the experience unified: the user is always "adding initiatives", just choosing whether they do the research themselves or the agent does it for them. There is no separate AI Suggestions page in the sidebar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Emissions Profile (Priority: P1)

As a sustainability expert, I want to view my organisation's emissions profile across all three scopes (Scope 1, 2, 3) so that I understand where my emissions come from before considering abatement options.

I can navigate through the organisational hierarchy (a variable-depth CompanyUnit tree) and see emissions broken down by scope and business activity at each level. For seeded sample data, the hierarchy uses mixed depth by branch: manufacturing operations go deeper (e.g., region → business unit → plant → area/line) while sales stays shallow (e.g., region → sales office). Summary statistics and trend data are presented clearly so I can identify the largest emission sources.

**Why this priority**: Without understanding the current emissions landscape, no meaningful abatement work can begin. This is the foundation that all other stories build upon and delivers immediate analytical value.

**Independent Test**: Can be fully tested by loading emissions data from the core application and verifying that the user can browse emissions across all scopes and org hierarchy levels. Delivers standalone value as an emissions explorer.

**Acceptance Scenarios**:

1. **Given** the user has connected to the core application, **When** they open the emissions overview, **Then** they see total emissions broken down by Scope 1, Scope 2, and Scope 3 with percentage contributions
2. **Given** the user is viewing the organisation-level overview, **When** they select a company unit, **Then** they see that unit's emissions broken down by scope and business activity
3. **Given** the user is viewing a company unit, **When** they select a child unit, **Then** they see that child unit's emissions broken down by scope and individual emission sources
4. **Given** emissions data spans multiple reporting periods, **When** the user views any level of the hierarchy, **Then** they see trend data showing emissions over time
5. **Given** the user is viewing emissions at any level, **When** they look at the summary, **Then** they see the top contributing sources ranked by magnitude

---

### User Story 2 - Define Custom Abatement Initiatives (Priority: P2)

As a sustainability expert, I want to define my own abatement initiatives so that I can model the cost and emissions reduction impact of specific actions I'm considering for my organisation.

For each initiative, I first select the target emission activity through a guided cascade (scope → question group → question → activity) and choose which company units it applies to. I then specify a name, description, estimated annual emissions reduction (tCO₂e/year), capital expenditure (CapEx, £), annual operational expenditure or saving (OpEx, £/year — negative for savings), expected lifespan (defaults to 10 years), implementation timeframe, and any relevant notes. The system computes lifecycle cost per tonne as (CapEx + OpEx × lifespan) / annual reduction and derives payback period where applicable. These initiatives are displayed on a Marginal Abatement Cost Curve chart showing lifecycle cost per tonne abated (£/tCO₂e) versus cumulative annual abatement potential, allowing me to prioritise the most cost-effective options. Initiatives with negative lifecycle cost (net savings) appear below the x-axis.

**Why this priority**: Manual initiative creation is the core MACC functionality. It allows experts to immediately model abatement scenarios using their domain expertise, without requiring AI features to be complete.

**Independent Test**: Can be fully tested by creating several abatement initiatives with varying costs and reduction potentials, and verifying they appear correctly on the MACC chart. Delivers standalone value as a planning and prioritisation tool.

**Acceptance Scenarios**:

1. **Given** the user is viewing their emissions profile, **When** they create a new abatement initiative, **Then** they can select a target activity via guided cascade (scope → question group → question → activity → company units), and specify the initiative name, estimated annual reduction (tCO₂e/year), CapEx (£), OpEx (£/year), lifespan (default 10 years), and implementation timeframe
2. **Given** the user has created multiple initiatives, **When** they view the MACC chart, **Then** initiatives are displayed as bars ordered by cost per tonne abated (lowest to highest, left to right), with bar width representing abatement volume and bar height representing cost per tonne
3. **Given** the user has created initiatives, **When** they view the cumulative impact, **Then** they see total projected emissions reduction and total cost across all selected initiatives
4. **Given** the user has created an initiative, **When** they edit or delete it, **Then** the MACC chart and cumulative totals update immediately
5. **Given** the user is defining an initiative, **When** they navigate the guided cascade, **Then** each step (scope, question group, question, activity) only shows options present in their loaded emissions data, and the final step shows applicable company units
6. **Given** the user has selected an activity and company units, **When** the entered annual reduction exceeds the total emissions for those sources, **Then** the system shows a yellow warning banner but does not prevent submission

---

### User Story 3 - Capture Organisational Context (Priority: P3)

As a sustainability expert, I want to provide organisational context (industry, geography, size, sustainability goals) so that the AI agent has the information it needs to suggest relevant abatement initiatives.

This includes capturing the organisation's industry classification, operating geographies, number of employees, revenue range, existing sustainability commitments, and any specific constraints or priorities for emissions reduction.

**Why this priority**: This is a prerequisite for AI-suggested initiatives (P4) but also has standalone value as an organisational profile that enriches the emissions analysis context.

**Independent Test**: Can be fully tested by completing the organisational profile form and verifying the captured data persists and is visible in the application. Delivers value as a structured record of the organisation's sustainability context.

**Acceptance Scenarios**:

1. **Given** the user opens the organisational context section, **When** they fill in industry classification, operating geographies, and organisation size, **Then** this information is saved and associated with their organisation
2. **Given** the user has existing sustainability commitments (e.g., net-zero targets), **When** they enter these targets, **Then** the system records them including target year and scope
3. **Given** the user has completed the organisational context, **When** they return to the application later, **Then** their previously entered context is preserved and editable
4. **Given** the user has entered organisational context, **When** they view the emissions overview, **Then** they see contextual information displayed alongside their emissions data (e.g., industry benchmarks if available)

---

### User Story 4 - AI-Suggested Abatement Initiatives (Priority: P4)

As a sustainability expert, I want an AI agent to suggest abatement initiatives based on my organisation's emissions profile, industry, and geography so that I can discover reduction opportunities I may not have considered.

The AI suggestions feature is accessed from the same "New Initiative" button on the MACC page that is used to create manual initiatives. When the user clicks this button, they choose between filling in the initiative form themselves (manual) or asking the AI agent to generate suggestions. This keeps the experience unified: the user is always "adding initiatives to the MACC", and the only difference is whether they provide their own research or let the agent do it. There is no separate AI Suggestions page in the sidebar navigation.

When requesting suggestions, the user explicitly chooses whether the agent should focus on cost-effective opportunities or highest-impact reductions regardless of cost, and this choice is passed as the suggestion priority. The agent analyses the organisation's emissions sources, industry context, and geographic factors to propose relevant, actionable abatement initiatives with estimated costs and reduction potentials. Accepted AI suggestions become standard initiatives in the global initiative list by default, with the option (but not the requirement) to add them to specific scenarios during or after acceptance. When a suggestion conceptually spans multiple activities, the system requires a valid per-activity breakdown of costs/savings and annual abatement and, on acceptance, creates separate concrete initiatives per activity (and associated company units) so that each initiative still targets a single activity. The user can review, accept, modify, or reject each suggestion.

**Why this priority**: This is the differentiating AI feature but depends on emissions data (P1), initiative modelling (P2), and organisational context (P3) being in place first.

**Independent Test**: Can be fully tested by loading emissions data and organisational context, requesting AI suggestions, and verifying the agent returns relevant initiatives that can be added to the MACC chart. Delivers value by surfacing opportunities the expert may have missed.

**Acceptance Scenarios**:

1. **Given** the user has loaded emissions data and completed their organisational context, **When** they click "New Initiative" on the MACC page and choose the AI suggestion option, **Then** the agent returns a list of relevant abatement initiatives with estimated costs and reduction potentials
2. **Given** the agent has suggested initiatives, **When** the user reviews a suggestion, **Then** they see a rationale explaining why this initiative is relevant to their organisation
3. **Given** the agent has suggested an initiative, **When** the user accepts it, **Then** it is added to their MACC chart alongside manually defined initiatives
4. **Given** the agent has suggested an initiative, **When** the user modifies it (adjusting cost or reduction estimates), **Then** the modified version is added to their initiatives
5. **Given** the agent has suggested an initiative, **When** the user rejects it, **Then** it is removed from the suggestions list and not included in the MACC chart
6. **Given** the user has accepted some AI suggestions, **When** they view the MACC chart, **Then** AI-suggested initiatives are visually distinguishable from manually created ones
7. **Given** the user opens the AI suggestions request form, **When** they choose between a cost-focused mode and a highest-impact mode and submit the request, **Then** the returned suggestions clearly reflect that chosen priority (e.g., cost-focused suggestions emphasise low cost per tonne; impact-focused suggestions emphasise larger abatement volumes even at higher cost)
8. **Given** the agent has suggested initiatives, **When** the user accepts a suggestion without selecting any scenario, **Then** the resulting initiative is created in the global initiative list only and remains available to be added to scenarios later
9. **Given** the agent has suggested initiatives, **When** the user accepts a suggestion and chooses one or more scenarios to add it to, **Then** the initiative is created in the global initiative list and also associated with each selected scenario so that it appears in those scenarios' MACC views and metrics
10. **Given** the AI cannot find any initiatives that fully satisfy the user's configured constraints or available data, **When** the user requests suggestions, **Then** the system still returns a small number of clearly flagged low-confidence suggestions, along with an explanation of which assumptions or constraints were relaxed so the user can decide whether to act on or discard them
11. **Given** the agent has suggested a programme-level idea that conceptually spans multiple activities, **When** the user accepts that suggestion, **Then** the system either (a) presents a per-activity breakdown of costs/savings and annual abatement for the user to review, or (b) automatically creates separate initiatives per activity with clearly visible per-activity figures, so that each resulting initiative continues to target a single activity while preserving the overall intent of the suggestion

---

### User Story 5 - Data Integration with Core Application (Priority: P5)

As a sustainability expert, I want to load my organisation's emissions data from the core EcoOnline application so that I can work with real, up-to-date data rather than manually entering it.

The system connects to the core application's API to retrieve the organisational hierarchy, emission sources, and historical emissions data. The user can select which assessment period to load and refresh data when the core application is updated.

**Why this priority**: While critical for production use, the data integration can be developed in parallel or after the core user interface stories. During development, sample/mock data can substitute.

**Independent Test**: Can be fully tested by connecting to the core application API, loading emissions data, and verifying it matches what is shown in the core application. Delivers value by eliminating manual data transfer.

**Acceptance Scenarios**:

1. **Given** the user has valid credentials for the core application, **When** they initiate data loading, **Then** the system retrieves the organisational hierarchy (organisation and company units)
2. **Given** the data loading is in progress, **When** the system is retrieving data, **Then** the user sees a progress indicator showing what is being loaded
3. **Given** emissions data has been loaded, **When** the user views the emissions overview, **Then** the data matches what is shown in the core application for the same period
4. **Given** data has been previously loaded, **When** the user requests a data refresh, **Then** only changed or new data is updated
5. **Given** the core application is unavailable during data loading, **When** the connection fails, **Then** the user sees a clear error message and any previously loaded data remains accessible

---

### User Story 6 - Align Plan with Emissions Targets (Priority: P2)

As a sustainability expert, I want to see how my selected abatement initiatives and scenarios align with our formal emissions reduction targets over time so that I know whether my plan is sufficient, where the gaps are, and how urgently I need additional measures.

The system overlays the impact of selected initiatives onto the organisation's existing targets (e.g., 2030/2040 reduction goals) and clearly shows whether we are on track, ahead, or behind for each milestone year.

**Why this priority**: Being able to demonstrate that a set of initiatives actually closes the gap to our stated targets is critical for internal approvals and external reporting.

**Independent Test**: Can be fully tested by configuring simple emissions trajectories and targets, applying different sets of initiatives, and verifying that the tool correctly reports on-track/behind status and the remaining gap.

**Acceptance Scenarios**:

1. **Given** the organisation has configured emissions reduction targets for specific years, **When** the user selects a set of initiatives, **Then** the system shows projected emissions for each target year alongside the target values
2. **Given** projected emissions exceed a target in any year, **When** the user views the target alignment summary, **Then** the system clearly highlights the gap (e.g., tonnes CO2e and percentage) and labels the plan as "off track" for that year
3. **Given** the user has multiple sets of initiatives (scenarios), **When** they switch between them, **Then** the target alignment view updates to reflect the currently selected scenario

---

### User Story 7 - Manage Initiative Lifecycle & Ownership (Priority: P2)

As a sustainability expert, I want to track the lifecycle and ownership of each abatement initiative so that the MACC portfolio reflects not just ideas, but which initiatives are approved, in progress, or completed, and who is responsible.

Each initiative has a status (idea, planned, approved, in progress, completed, rejected), an owner, and key milestone dates. I can filter the MACC and tables by status and owner to focus on implementable actions.

**Why this priority**: Without status and ownership, the MACC is an analytical sandbox rather than a portfolio management tool that can be used in governance processes.

**Independent Test**: Can be fully tested by creating initiatives, assigning owners and statuses, updating them over time, and verifying that filters and counts reflect the current state of the portfolio.

**Acceptance Scenarios**:

1. **Given** the user creates or edits an initiative, **When** they set its status and owner, **Then** this information is saved and visible wherever the initiative appears
2. **Given** initiatives have varying statuses, **When** the user filters the MACC view to show only approved and in-progress initiatives, **Then** only those initiatives appear on the chart and in the accompanying table
3. **Given** an initiative is marked as completed, **When** the user views the portfolio summary, **Then** completed initiatives are clearly distinguished and can optionally be excluded from future planning scenarios

---

### User Story 8 - Compare Abatement Scenarios (Priority: P3)

As a sustainability expert, I want to define and compare multiple scenarios (sets of initiatives) so that I can explore different pathways, such as low-capex options, maximum reductions, or specific-scope focus.

Each scenario consists of a named set of initiatives and can be compared side by side in terms of total abatement, total cost, cost per tonne, and alignment with targets.

**Why this priority**: Real decision-making requires comparing alternative portfolios, not just a single MACC configuration.

**Independent Test**: Can be fully tested by creating multiple scenarios with overlapping initiatives and verifying that their metrics and target alignment are computed and compared correctly.

**Acceptance Scenarios**:

1. **Given** the user has created several initiatives, **When** they create a new scenario, **Then** they can select which initiatives belong to that scenario and give it a descriptive name
2. **Given** multiple scenarios exist, **When** the user opens the scenario comparison view, **Then** they see key metrics (total reduction, total cost, average cost per tonne, target alignment status) for each scenario side by side
3. **Given** a scenario is updated (initiatives added or removed), **When** the user revisits the comparison view, **Then** the metrics and target alignment reflect the latest configuration

---

### User Story 9 - Configure AI Constraints & Preferences (Priority: P3)

As a sustainability expert, I want to configure constraints and preferences for the AI agent (e.g., budget limits, excluded technologies, protected facilities) so that suggested initiatives are realistic, compliant, and politically feasible for my organisation.

I can specify maximum total and per-initiative budgets, disallowed initiative types or technologies, excluded facilities or scopes, and high-level policy or regulatory constraints that the AI must respect.

**Why this priority**: Unconstrained AI suggestions may propose measures that are theoretically effective but impossible to implement in our organisational or regulatory context.

**Independent Test**: Can be fully tested by configuring constraints, generating suggestions, and verifying that no suggestions violate the defined limits.

**Acceptance Scenarios**:

1. **Given** the user has configured a maximum total budget for AI-suggested initiatives, **When** they request suggestions, **Then** the total cost of all suggested initiatives does not exceed that budget
2. **Given** the user has marked specific initiative types or technologies as disallowed, **When** the AI generates suggestions, **Then** none of the suggestions use those disallowed types or technologies
3. **Given** the user has excluded certain facilities or scopes from AI suggestions, **When** they request new suggestions, **Then** no suggested initiative targets those excluded facilities or scopes

---

### User Story 10 - See Data Quality & Uncertainty (Priority: P3)

As a sustainability expert, I want to understand the quality and uncertainty of both my emissions data and initiative impact estimates so that I can judge how much confidence to place in the MACC and any derived decisions.

The system surfaces confidence levels or uncertainty ranges for key data points (e.g., Scope 3 estimates, initiative cost and reduction assumptions) and highlights where decisions are based on weak data.

**Why this priority**: Decisions on major investments and public commitments require transparency about data quality and uncertainty.

**Independent Test**: Can be fully tested by loading emissions and initiative data with varying confidence levels and verifying that the UI clearly presents and filters by those levels.

**Acceptance Scenarios**:

1. **Given** emissions data records include confidence indicators, **When** the user views emissions at any level, **Then** data points with lower confidence are visibly flagged (e.g., with an icon or label)
2. **Given** initiatives include cost and reduction estimates with uncertainty ranges, **When** the user views the MACC chart, **Then** they can access or view the associated uncertainty (e.g., ranges for cost per tonne)
3. **Given** the user wants to focus on high-confidence insights, **When** they apply a filter for minimum confidence level, **Then** only emissions and initiatives meeting that threshold are used in summary metrics and visualisations

---

### User Story 11 - Export and Share MACC Results (Priority: P4)

As a sustainability expert, I want to export MACC charts and initiative tables so that I can share them with leadership, finance, and external stakeholders without requiring them to use this application directly.

I can export data and visualisations in common formats suitable for presentations and further analysis.

**Why this priority**: Much of the value of MACC analysis comes from communicating findings and recommendations to decision-makers.

**Independent Test**: Can be fully tested by generating MACC views and initiative tables, exporting them, and verifying that the exported artefacts contain the expected content and are usable in standard tools.

**Acceptance Scenarios**:

1. **Given** the user is viewing a MACC chart and initiative table, **When** they export results, **Then** they can obtain a data file (e.g., spreadsheet-like format) containing the underlying initiative data and key summary metrics
2. **Given** the user has exported a visual representation of the MACC chart, **When** they insert it into a presentation or document, **Then** the chart remains readable and matches what was shown in the application
3. **Given** the user needs to share scenario comparisons, **When** they export a scenario comparison view, **Then** the exported artefact includes all compared scenarios with their main metrics

---

### Edge Cases

- What happens when the organisation has no emissions data for a particular scope? The system displays zero with a note indicating no data is available for that scope.
- What happens when the core application API is unavailable? The system falls back to previously loaded data with a notification that data may be stale, and displays the last successful sync timestamp.
- What happens when an initiative's target emission source is removed from the loaded data on refresh? The initiative is flagged as orphaned, and the user is prompted to re-map it to a valid source or archive it.
- What happens when the AI agent cannot generate suggestions due to insufficient context? The system informs the user which specific context fields need to be completed before suggestions can be generated.
 - What happens when the AI cannot find any initiatives that fully satisfy configured constraints? The system gradually relaxes constraints in a controlled way, returns a small set of clearly flagged low-confidence suggestions, and explains which constraints were relaxed so users can decide whether to act on or discard them.
- What happens when two initiatives target the same emission source and their combined reduction exceeds the source's total emissions? The system shows a yellow warning banner (non-blocking) about the over-abatement and highlights the overlap on the MACC chart. The user is not prevented from saving, as the source data may be incomplete or incorrect.
- How does the system handle negative-cost initiatives (initiatives that save money)? These appear below the x-axis on the MACC chart, indicating they are cost-saving measures.
- What happens when emissions data changes between assessment periods? The system maintains a clear distinction between periods and does not mix data from different reporting years.
 - What happens when an initiative is rejected for non-technical reasons (e.g., policy constraints)? The system records the rejection reason so similar AI suggestions can be deprioritised in future.
- What happens when uncertainty in data is too high to support reliable MACC analysis for a scope or site? The system clearly flags this and may hide or de-emphasise those elements until better data is available.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST load organisational hierarchy (organisation and company units) from the core application API
- **FR-002**: System MUST load emissions data (Scope 1, 2, 3) for all levels of the organisational hierarchy from the core application API
- **FR-003**: System MUST display total emissions broken down by Scope 1, Scope 2, and Scope 3 at the organisation level
- **FR-004**: System MUST allow users to navigate the organisational hierarchy and view emissions at each company unit level
- **FR-005**: System MUST display emissions broken down by business activity and emission source at each hierarchy level
- **FR-006**: System MUST show emissions trends over time for each hierarchy level and scope
- **FR-007**: System MUST allow users to create abatement initiatives with: target activity (via guided cascade: scope → question group → question → activity → company units), name, description, estimated annual reduction (tCO₂e/year), CapEx (£), OpEx (£/year), lifespan (default 10 years), and implementation timeframe
- **FR-008**: System MUST render a Marginal Abatement Cost Curve chart displaying initiatives ordered by lifecycle cost per tonne abated (£/tCO₂e), computed as (CapEx + OpEx × lifespan) / annual reduction, with bar width showing annual abatement volume and bar height showing lifecycle unit cost. Negative-cost initiatives appear below the x-axis.
- **FR-009**: System MUST calculate and display cumulative abatement potential and total cost across selected initiatives
- **FR-010**: System MUST allow users to edit and delete abatement initiatives with immediate chart updates
- **FR-011**: System MUST capture organisational context including: industry classification, operating geographies, organisation size, and sustainability targets
- **FR-012**: System MUST persist all user-entered data (initiatives, organisational context) locally
- **FR-013**: System MUST provide AI-generated abatement initiative suggestions, accessed via the "New Initiative" flow on the MACC page rather than a separate page. The user chooses between a cost-focused mode and a highest-impact mode before requesting suggestions. Suggestions are based on the organisation's emissions profile, industry, geography, and emission sources.
- **FR-014**: System MUST display a rationale for each AI-suggested initiative explaining its relevance
- **FR-015**: System MUST allow users to accept, modify, or reject AI-suggested initiatives. Accepted suggestions create global initiatives by default; adding to scenarios is optional.
- **FR-016**: System MUST visually distinguish AI-suggested initiatives from manually created ones on the MACC chart
- **FR-017**: When the AI cannot generate suggestions that fully satisfy configured constraints or available data, the system MUST still return a small number of clearly flagged low-confidence suggestions, explaining which constraints were relaxed, so users can decide whether to act on or discard them
- **FR-027**: When an AI suggestion conceptually spans multiple activities, the system MUST require a valid per-activity breakdown of costs/savings and annual abatement, and on acceptance MUST create separate initiatives per activity so that each initiative targets a single activity
- **FR-018**: System MUST show a yellow warning banner (non-blocking) when an initiative's reduction exceeds the total emissions for its selected sources, or when combined initiative reductions exceed a source's total emissions. The warning does not prevent submission.
- **FR-019**: System MUST support data refresh from the core application with incremental updates
- **FR-020**: System MUST allow configuration of organisational emissions reduction targets and compute projected emissions trajectories based on selected initiatives
- **FR-021**: System MUST indicate, for each target year, whether the current set of initiatives and scenarios achieves, exceeds, or falls short of configured targets and by what margin
- **FR-022**: System MUST allow initiatives to have lifecycle metadata including status, owner, and key milestone dates, and enable filtering by these fields
- **FR-023**: System MUST support creation and management of named scenarios comprising selected initiatives, and compute aggregate metrics (total reduction, total cost, cost per tonne, target alignment) per scenario
- **FR-024**: System MUST allow configuration of constraints and preferences for AI suggestions (e.g., budget limits, excluded initiative types, excluded facilities/scopes) and enforce these when generating suggestions. When no suggestions fully satisfy constraints, the system softly relaxes them and clearly flags the deviation (see FR-017).
- **FR-025**: System MUST represent and surface data quality or confidence levels for emissions data and initiative assumptions, and allow filtering based on these levels
- **FR-026**: System MUST provide export capabilities for MACC charts, initiative tables, and scenario comparisons into commonly used formats suitable for reporting and further analysis

### Key Entities

- **Organisation**: The top-level entity representing the customer's organisation. Has a hierarchy of company units. Linked to industry classification, geography, and sustainability targets.
- **Company Unit**: A node in a variable-depth organisational tree (e.g., region, business unit, plant, area/line, sales office). Aggregates emissions from its subtree and can contain child units.
- **Emission Source**: A specific source of emissions within a company unit that represents a physical site or operational unit (e.g., grid electricity, natural gas, fleet vehicles). Has a scope classification (1, 2, or 3), business activity, quantity, unit, and time period.
- **Abatement Initiative**: A proposed action to reduce emissions. Targets a single activity (selected via guided cascade) across one or more company units. Has a name, description, estimated annual reduction (tCO₂e/year), CapEx (£), OpEx (£/year), lifespan (years, default 10), computed lifecycle cost per tonne and payback period, implementation timeframe, lifecycle status, owner, key milestone dates, and origin (manual or AI-suggested).
- **Organisational Context**: A profile capturing the organisation's industry, geographies, size, and sustainability commitments. Used by the AI agent to generate relevant suggestions.
- **MACC Chart**: A visual representation of abatement initiatives ordered by cost-effectiveness. Each initiative is a bar where width = abatement volume and height = cost per tonne CO2e abated.
 - **Scenario**: A named portfolio of initiatives representing a particular pathway or planning option (e.g., low-capex scenario). Aggregates metrics such as total abatement, total cost, cost per tonne, and target alignment for comparison against other scenarios.

## Assumptions

- The core EcoOnline application provides a stable REST API with endpoints for retrieving organisational hierarchy and emissions data
- Emissions data follows the GHG Protocol classification of Scope 1, 2, and 3
- The organisational hierarchy is a variable-depth CompanyUnit tree matching what is visible in the core application data
- Currency is GBP (£) throughout. All monetary field names use a `_gbp` suffix (e.g., `capex_gbp`, `opex_annual_gbp`). Multi-currency support is out of scope for initial release.
- AI agent suggestions are generated per request (not continuously), and the user explicitly triggers the suggestion process
- Industry classifications follow a standard taxonomy (e.g., NACE, SIC codes)
- The application operates with a single-tenant model (one organisation per deployment instance)
 - For the initial release, collaboration is assumed to be within a small central team using shared credentials or roles; fine-grained multi-user collaboration features (comments, concurrent editing) are out of scope.
- Seed/sample data represents a fictional heavy industrial manufacturing company with physical operations in GB, NO, SE, FI, DK, US, CA and a global sales operation represented as sales offices/units
- Seed/sample emissions totals should be generated to approximate a heavy-industrial profile with Scope 3 dominant overall (target mix: ~70% Scope 3 / ~20% Scope 2 / ~10% Scope 1)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their complete emissions profile across all 3 scopes within 30 seconds of loading data
- **SC-002**: Users can navigate from organisation level to any site-level company unit's emissions detail within 3 clicks
- **SC-003**: Users can create an abatement initiative and see it on the MACC chart within 2 minutes
- **SC-004**: The MACC chart correctly renders all initiatives ordered by cost per tonne abated within 2 seconds of any change
- **SC-005**: AI agent returns at least 5 relevant abatement suggestions within 60 seconds of the user's request
- **SC-006**: 80% of users can identify their top 3 emission sources from the emissions overview without guidance
- **SC-007**: Data loaded from the core application matches the source data with 100% accuracy
- **SC-008**: Users report the tool is useful for emissions reduction planning in post-usage feedback (target: 75% positive rating)
- **SC-009**: For configured emissions targets, the tool correctly identifies on-track/off-track status for at least 95% of tested synthetic scenarios in QA
- **SC-010**: In usability tests, at least 80% of sustainability users are able to create and compare two distinct scenarios and explain the difference in abatement and cost using the tool alone
