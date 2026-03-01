# Data Model: Marginal Abatement Cost Curve Modelling

**Feature**: 001-macc-modelling | **Date**: 2026-02-28

## Entity Relationship Overview

```
Organisation (1)
 ├── CompanyUnit (1:N, self-referential tree via immediate_parent_id)
 │    │   type = "division" → organisational grouping (variable depth)
 │    │   type = "site" → physical location (leaf nodes)
 │    └── EmissionSource (1:N, linked to site-level units)
 │         └── EmissionRecord (1:N)
 ├── OrganisationalContext (1:1)
 │    └── EmissionTarget (1:N)
 ├── AbatementInitiative (1:N)
 │    └── InitiativeEmissionSource (N:M link)
 ├── Scenario (1:N)
 │    └── ScenarioInitiative (N:M link)
 ├── AISuggestionRequest (1:N)
 │    └── AISuggestion (1:N)
 ├── AIConstraintConfig (1:1)
 └── SyncLog (1:N)
```

> **Schema alignment note**: The `CompanyUnit` entity mirrors the `company_construct` table from the EcoOnline analytics database. Field names and types are kept consistent with the source to simplify data sync.

---

## Entities

### Organisation

Top-level entity representing the customer's company. Maps to the `company` field in `company_construct`.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Unique identifier |
| company | string(255) | NOT NULL, UNIQUE | Company name from EcoOnline (e.g., "Macmillan") |
| root_company_unit_id | integer | UNIQUE, nullable | Root company_unit_id from EcoOnline hierarchy |
| created_at | datetime | NOT NULL, default now | Record creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification timestamp |

**Relationships**: has many CompanyUnits, has one OrganisationalContext, has many AbatementInitiatives, has many Scenarios

---

### CompanyUnit

A node in the organisational hierarchy tree. Mirrors the `company_construct` table from the EcoOnline analytics database. Units are either `division` (organisational groupings at any depth) or `site` (physical locations, typically leaf nodes).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Internal unique identifier |
| organisation_id | UUID (string) | FK → Organisation.id, NOT NULL | Parent organisation |
| company_unit_id | integer | UNIQUE, NOT NULL | ID from EcoOnline `company_construct` |
| company_unit_name | string(255) | NOT NULL | Unit name (e.g., "Global Trade", "New Delhi") |
| company_unit_type | string(20) | NOT NULL, CHECK("division", "site") | Node type in hierarchy |
| immediate_parent_id | integer | nullable, FK → CompanyUnit.company_unit_id | Parent unit (null = root) |
| immediate_parent_name | string(255) | nullable | Denormalised parent name |
| facility_type | string(100) | nullable | Site classification: Office, Mill, Servers, Packaging, etc. |
| city | string(255) | nullable | City name |
| continent | string(100) | nullable | Continent name |
| country | string(100) | nullable | Country name |
| country_code | string(10) | nullable | ISO country code |
| state | string(100) | nullable | State/province name |
| state_code | string(10) | nullable | State/province code |
| latitude | float | nullable | Geographic latitude |
| longitude | float | nullable | Geographic longitude |
| location_id | integer | nullable | EcoOnline location reference |
| level_1 | string(255) | nullable | Denormalised top-level division name |
| level_2 | string(255) | nullable | Denormalised second-level name |
| level_3 | string(255) | nullable | Denormalised third-level name |
| external_id | string(100) | nullable | External reference ID |
| financial_year_start_day | integer | nullable | Financial year start day (1-31) |
| financial_year_start_month | integer | nullable | Financial year start month (1-12) |
| open_date | date | nullable | Date the unit became operational |
| close_date | date | nullable | Date the unit was closed |
| created_at | datetime | NOT NULL, default now | Record creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification timestamp |

**Relationships**: belongs to Organisation, self-referential parent via `immediate_parent_id`, has many EmissionSources (when type = "site")

**Indexes**: `(organisation_id)`, `(company_unit_id)` UNIQUE, `(immediate_parent_id)`, `(company_unit_type)`, `(country_code)`

**Hierarchy notes**:
- Root nodes have `immediate_parent_id = NULL`
- Depth is variable (observed 2–5 levels in production data)
- `level_1`, `level_2`, `level_3` are denormalised for query convenience but the tree structure is authoritative
- Sites (`company_unit_type = "site"`) are typically leaf nodes but this is not enforced
- Units with a `close_date` in the past should be excluded from active emissions views

---

### EmissionSource

A specific emissions measurement series at a company unit. Maps to a unique `answer_id` from the EcoOnline `answers_construct` analytics table. The user-configured taxonomy is captured as a 3-level hierarchy: `question_group` → `question` → `activity`.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Internal unique identifier |
| company_unit_id | UUID (string) | FK → CompanyUnit.id, NOT NULL | Parent company unit (typically a site) |
| answer_id | integer | UNIQUE, NOT NULL | Stable ID from EcoOnline `answers_construct` |
| activity | string(255) | NOT NULL | Activity name (e.g., "Electricity consumption, eGrid: ERCOT All") |
| question | string(255) | NOT NULL | Question name (e.g., "Electricity") |
| question_group | string(255) | NOT NULL | Question group (e.g., "Premises") — top level of taxonomy |
| answer_unit | string(50) | NOT NULL | Original measurement unit (e.g., "kWh", "US Gallon") |
| created_at | datetime | NOT NULL, default now | Record creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification timestamp |

**Relationships**: belongs to CompanyUnit, has many EmissionRecords, many-to-many with AbatementInitiative

**Indexes**: `(company_unit_id)`, `(answer_id)` UNIQUE

> **Schema alignment note**: The taxonomy fields (`activity`, `question`, `question_group`) are user-configured in the EcoOnline platform and provide a classification system that makes sense to the customer. `answer_id` is the stable foreign key for syncing.

---

### EmissionRecord

A single monthly emissions data point for a source. Each record captures one month of emissions for a specific scope and reporting approach (Location/Market). A single `EmissionSource` can produce multiple records per month when it generates emissions across scopes (e.g., Scope 2 electricity + Scope 3 T&D losses) and both market factor types.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Internal unique identifier |
| emission_source_id | UUID (string) | FK → EmissionSource.id, NOT NULL | Parent source |
| year | integer | NOT NULL | Reporting year |
| month | integer | NOT NULL, CHECK(1-12) | Reporting month |
| scope | integer | NOT NULL, CHECK(1-3) | GHG Protocol scope |
| market_factor_type | string(20) | NOT NULL, CHECK("Location", "Market") | GHG Protocol Scope 2 reporting approach |
| value | float | NOT NULL | Answer value in source unit, prorated to month |
| co2e_kg | float | NOT NULL | Calculated CO2e in kilograms for this month |
| quality | string(20) | nullable | Data quality indicator (e.g., "Estimated", "Actual") |
| upstream | string(50) | NOT NULL, default "Regular" | "Regular" or "Upstream" |
| upstream_name | string(255) | nullable | Upstream source description (e.g., "Electricity - T & D losses, eGrid, ERCT") |
| created_at | datetime | NOT NULL, default now | Record creation timestamp |

**Relationships**: belongs to EmissionSource

**Indexes**:
- `(emission_source_id, year, month)` composite — time series per source
- `(year, scope, market_factor_type)` composite — aggregation queries
- `(year, month)` — monthly rollups

**Unique constraint**: `(emission_source_id, year, month, scope, market_factor_type, upstream)` — prevents duplicate records

> **Dual reporting**: For Scope 2, both Location-based and Market-based records are stored. The UI provides a toggle to switch between approaches for abatement planning. For Scopes 1 and 3, Location and Market values are typically identical but both are stored for consistency with the source data.

---

### AbatementInitiative

A proposed action to reduce emissions. Field names align with the Initiatives API contract.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Unique identifier |
| organisation_id | UUID (string) | FK → Organisation.id, NOT NULL | Parent organisation |
| name | string(255) | NOT NULL | Initiative name |
| description | text | nullable | Detailed description |
| initiative_type | string(20) | NOT NULL, default "custom" | "custom" or "ai_suggested" |
| status | string(20) | NOT NULL, default "idea" | Lifecycle status |
| capex_gbp | float | NOT NULL | One-time capital expenditure (£, always ≥ 0) |
| opex_annual_gbp | float | NOT NULL, default 0 | Annual operational cost (positive) or saving (negative), £/year |
| co2e_reduction_annual_tonnes | float | NOT NULL, > 0 | Estimated annual CO2e reduction (tonnes/year) |
| cost_per_tonne | float | NOT NULL | Computed: (capex_gbp + opex_annual_gbp × lifespan_years) / co2e_reduction_annual_tonnes |
| payback_years | float | nullable | Computed: capex_gbp / |opex_annual_gbp| when opex < 0; NULL otherwise. Not user-editable. |
| lifespan_years | integer | NOT NULL, default 10 | Expected initiative lifespan in years (required, default 10) |
| owner | string(255) | nullable | Responsible person |
| confidence | string(20) | nullable | Confidence level: "high", "medium", "low" |
| notes | text | nullable | Additional notes or assumptions |
| source_suggestion_id | UUID (string) | FK → AISuggestion.id, nullable | Link to AI suggestion if accepted |
| ai_rationale | text | nullable | AI-generated rationale (if initiative_type=ai_suggested) |
| rejection_reason | text | nullable | Reason for rejection (for AI learning) |
| created_at | datetime | NOT NULL, default now | Record creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification timestamp |

**Valid statuses**: `idea`, `planned`, `approved`, `in_progress`, `completed`, `rejected`

**Relationships**: belongs to Organisation, many-to-many with EmissionSource (via InitiativeEmissionSource), many-to-many with Scenario (via ScenarioInitiative), optionally links to AISuggestion

**Indexes**: `(organisation_id)`, `(status)`, `(initiative_type)`

---

### InitiativeEmissionSource

Link table between AbatementInitiative and EmissionSource (many-to-many).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| initiative_id | UUID (string) | FK → AbatementInitiative.id, PK | Initiative reference |
| emission_source_id | UUID (string) | FK → EmissionSource.id, PK | Target emission source |

---

### Scenario

A named portfolio of initiatives for pathway comparison. Field names align with the Scenarios API contract.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Unique identifier |
| organisation_id | UUID (string) | FK → Organisation.id, NOT NULL | Parent organisation |
| name | string(255) | NOT NULL | Scenario name |
| description | text | nullable | Scenario description |
| is_baseline | boolean | NOT NULL, default false | Whether this is the baseline scenario (max one per org) |
| created_at | datetime | NOT NULL, default now | Record creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification timestamp |

**Relationships**: belongs to Organisation, many-to-many with AbatementInitiative (via ScenarioInitiative)

**Indexes**: `(organisation_id)`

**Constraint**: Only one scenario per organisation can have `is_baseline = true` at a time (enforced at application level)

---

### ScenarioInitiative

Link table between Scenario and AbatementInitiative (many-to-many) with display ordering.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| scenario_id | UUID (string) | FK → Scenario.id, PK | Scenario reference |
| initiative_id | UUID (string) | FK → AbatementInitiative.id, PK | Initiative reference |
| display_order | integer | NOT NULL, default 0 | Order for MACC chart display |
| is_included | boolean | NOT NULL, default true | Whether initiative is active in scenario |

---

### OrganisationalContext

Profile capturing org-level context for AI and reporting. Field names align with the Context API contract.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Unique identifier |
| organisation_id | UUID (string) | FK → Organisation.id, UNIQUE, NOT NULL | Parent organisation |
| industry_sector | string(100) | nullable | Industry sector (e.g., "Manufacturing", "Technology") |
| employee_count | integer | nullable, > 0 | Number of employees |
| annual_revenue_gbp | float | nullable, > 0 | Annual revenue in GBP (£) |
| operating_geographies | JSON | nullable | List of country/region strings (max 50) |
| sustainability_maturity | string(20) | nullable, CHECK("beginner", "intermediate", "advanced") | Sustainability programme maturity |
| budget_constraint_gbp | float | nullable, > 0 | Total available abatement budget in GBP (£) |
| target_year | integer | nullable | Primary target year for net-zero/reduction goals |
| notes | text | nullable | Additional context or priorities |
| created_at | datetime | NOT NULL, default now | Record creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification timestamp |

**Relationships**: belongs to Organisation, has many EmissionTargets

---

### EmissionTarget

A formal emissions reduction target for a specific year. Field names align with the Context API contract.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Unique identifier |
| context_id | UUID (string) | FK → OrganisationalContext.id, NOT NULL | Parent context |
| target_year | integer | NOT NULL | Target milestone year |
| target_type | string(20) | NOT NULL | "absolute" or "intensity" |
| target_value_pct | float | NOT NULL, 0.1–100.0 | % reduction from baseline |
| baseline_year | integer | NOT NULL | Baseline year for comparison |
| baseline_co2e_tonnes | float | NOT NULL | Baseline emissions in tonnes CO2e |
| target_co2e_tonnes | float | nullable | Computed: baseline × (1 - target_value_pct/100) |
| scope_coverage | JSON | nullable | Array of scope integers, e.g. [1, 2] |
| source | string(100) | nullable | Target framework (e.g., "SBTi", "internal") |
| notes | string(255) | nullable | Target description (e.g., "Net Zero 2040") |
| created_at | datetime | NOT NULL, default now | Record creation timestamp |

**Relationships**: belongs to OrganisationalContext

**Indexes**: `(context_id, target_year)` composite

---

### AIConstraintConfig

User-defined constraints for AI suggestion generation. Field names align with the AI Suggestions API contract.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Unique identifier |
| organisation_id | UUID (string) | FK → Organisation.id, UNIQUE, NOT NULL | Parent organisation |
| excluded_technologies | JSON | nullable | List of disallowed technology types |
| excluded_unit_ids | JSON | nullable | List of CompanyUnit UUIDs to exclude |
| excluded_scopes | JSON | nullable | List of scopes to exclude (1, 2, 3) |
| max_initiative_cost_gbp | float | nullable | Maximum cost per initiative in GBP (£) |
| min_confidence_level | string(20) | nullable, CHECK("low", "medium", "high") | Minimum AI confidence threshold |
| preferred_payback_years | integer | nullable, > 0 | Maximum acceptable payback period |
| industry_specific_filters | JSON | nullable | Custom key-value filter config |
| updated_at | datetime | NOT NULL, auto-update | Last modification timestamp |

**Relationships**: belongs to Organisation

---

### AISuggestionRequest

Audit log of AI suggestion requests.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Unique identifier |
| organisation_id | UUID (string) | FK → Organisation.id, NOT NULL | Parent organisation |
| scope_focus | JSON | nullable | Array of scope integers requested (e.g., [1, 2]); null = all scopes |
| priority | string(20) | NOT NULL, CHECK("cost_effective", "high_impact") | User-chosen suggestion priority mode |
| input_hash | string(64) | NOT NULL | SHA-256 of input data (for caching) |
| model_used | string(50) | NOT NULL | AI model identifier |
| input_token_count | integer | nullable | Tokens consumed (input) |
| output_token_count | integer | nullable | Tokens consumed (output) |
| latency_ms | integer | nullable | Response time in milliseconds |
| status | string(20) | NOT NULL | "success", "error", "refused" |
| constraints_relaxed | JSON | nullable | Object describing which constraints were relaxed to generate results (null if none) |
| error_message | text | nullable | Error details if failed |
| created_at | datetime | NOT NULL, default now | Request timestamp |

**Relationships**: belongs to Organisation, has many AISuggestions

---

### AISuggestion

A single AI-generated suggestion (cached response).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Unique identifier |
| request_id | UUID (string) | FK → AISuggestionRequest.id, NOT NULL | Parent request |
| suggestion_data | JSON | NOT NULL | Full suggestion payload (name, rationale, estimates, assumptions) |
| confidence | string(20) | NOT NULL, CHECK("low", "medium", "high") | AI confidence in this suggestion |
| confidence_notes | text | nullable | Explanation when confidence is low (e.g., which constraints were relaxed) |
| activity_breakdown | JSON | nullable | Per-activity breakdown for multi-activity suggestions; null for single-activity |
| accepted | boolean | nullable | User accepted/rejected (null = pending) |
| dismiss_reason | text | nullable | User-provided reason for dismissal (used for future deprioritisation) |
| created_at | datetime | NOT NULL, default now | Record creation timestamp |

**Relationships**: belongs to AISuggestionRequest, optionally links to one or more AbatementInitiatives (via `source_suggestion_id` FK on AbatementInitiative)

**Note**: For multi-activity suggestions, acceptance creates multiple AbatementInitiative rows (one per activity breakdown item), all referencing this AISuggestion via `source_suggestion_id`.

---

### SyncLog

Audit trail for data synchronisation with EcoOnline.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID (string) | PK | Unique identifier |
| organisation_id | UUID (string) | FK → Organisation.id, NOT NULL | Parent organisation |
| sync_type | string(50) | NOT NULL | "full", "incremental" |
| status | string(20) | NOT NULL | "started", "completed", "failed" |
| records_created | integer | default 0 | New records imported |
| records_updated | integer | default 0 | Existing records updated |
| correlation_id | UUID (string) | NOT NULL | Request correlation ID |
| error_message | text | nullable | Error details if failed |
| started_at | datetime | NOT NULL, default now | Sync start time |
| completed_at | datetime | nullable | Sync completion time |

**Relationships**: belongs to Organisation

---

## Validation Rules

| Entity | Rule | Description |
|--------|------|-------------|
| CompanyUnit | company_unit_type IN ("division", "site") | Only valid hierarchy node types |
| CompanyUnit | immediate_parent_id refers to existing company_unit_id | Referential integrity within tree |
| CompanyUnit | No circular parent references | Tree must be acyclic |
| CompanyUnit | close_date > open_date (when both set) | Logical date ordering |
| EmissionRecord | co2e_kg >= 0 | Emissions cannot be negative |
| EmissionRecord | scope IN (1, 2, 3) | Must be a valid GHG scope |
| EmissionRecord | market_factor_type IN ("Location", "Market") | Valid reporting approach |
| EmissionRecord | month IN (1-12) | Valid month |
| EmissionRecord | upstream IN ("Regular", "Upstream") | Valid upstream classification |
| EmissionSource | answer_id is unique | One source per answer |
| AbatementInitiative | co2e_reduction_annual_tonnes > 0 | Annual reduction must be positive |
| AbatementInitiative | cost_per_tonne = (capex_gbp + opex_annual_gbp × lifespan_years) / co2e_reduction_annual_tonnes | Derived field — lifecycle cost per tonne |
| AbatementInitiative | status IN valid set | Only valid lifecycle states |
| AbatementInitiative | initiative_type IN ("custom", "ai_suggested") | Valid origin types |
| EmissionTarget | target_value_pct > 0 AND <= 100 | Valid percentage range |
| EmissionTarget | target_year > baseline_year | Target must be after baseline |

## State Transitions

### AbatementInitiative.status

```
idea → planned → approved → in_progress → completed
  ↓       ↓         ↓            ↓
  └───────┴─────────┴────────────┴──→ rejected
```

- Any non-terminal status can transition to `rejected`
- `completed` and `rejected` are terminal states
- Status changes update `updated_at` automatically
