# Feature Specification: Initiative Lead Time Investment

**Feature Branch**: `002-lead-time-investment`  
**Created**: 2026-03-03  
**Status**: Draft  
**Input**: User description: "I want to start a new feature development to allow users to define a lead time investment in the initiative models to better understand costs before ROI on abatement opportunities"

## Clarifications

### Session 2026-03-03

- Q: For the new lead time fields in the initiative form, should they be positioned as a separate "Lead Time" subsection or inline with the existing cost fields? → A: Separate "Lead Time & Pre-Operational Costs" subsection positioned between the "Status" field and the existing "Costs" section

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define Lead Time for an Initiative (Priority: P1)

As a sustainability expert, I want to specify how long it takes for an abatement initiative to become operational after the investment decision is made, so that I can model the realistic delay before emissions reductions and savings begin.

When creating or editing an initiative, I can enter a **lead time period** (in months) that represents the implementation, procurement, installation, or ramp-up phase before the initiative starts delivering its stated annual CO₂e reduction. I can also specify **lead time costs** — expenditure incurred during this pre-operational period that is separate from the ongoing CapEx and OpEx (e.g., feasibility studies, planning, permits, construction, training). The system defaults lead time to 0 months (immediate effect) and lead time cost to £0 so that existing initiatives are unaffected.

**Why this priority**: This is the foundational capability — without capturing lead time data on initiatives, none of the downstream analysis or visualisation stories can function.

**Independent Test**: Can be fully tested by creating an initiative with a lead time period and lead time cost, saving it, and verifying the values are persisted and displayed correctly on the initiative detail view.

**Acceptance Scenarios**:

1. **Given** the user is creating a new initiative, **When** they reach the cost inputs section, **Then** they see a "Lead Time & Pre-Operational Costs" subsection (positioned between Status and main Costs) with fields for lead time period (months) and lead time cost (£)
2. **Given** the user is editing an existing initiative, **When** they view the Lead Time & Pre-Operational Costs section, **Then** lead time period defaults to 0 months and lead time cost defaults to £0 if not previously set
3. **Given** the user enters a lead time period of 18 months and a lead time cost of £50,000, **When** they save the initiative, **Then** the values are persisted and displayed on the initiative detail view
4. **Given** the user enters a lead time period of 0 months, **When** they save the initiative, **Then** the initiative behaves identically to the current model (no delay, no additional cost)
5. **Given** the user leaves the lead time fields at their defaults, **When** they save a new initiative, **Then** the initiative is created successfully with lead time period of 0 and lead time cost of £0

---

### User Story 2 - Revised Cost Calculations Including Lead Time (Priority: P2)

As a sustainability expert, I want the system to incorporate lead time costs into the initiative's total cost calculations so that I get a more accurate picture of the true cost per tonne of abatement.

The lifecycle cost formula is extended to include lead time costs:
- **Total lifecycle cost** = Lead Time Cost + CapEx + (OpEx annual × Lifespan years)
- **Cost per tonne** = Total lifecycle cost / Annual CO₂e reduction
- **Payback period** is recalculated to account for the lead time delay: the payback clock starts only after lead time ends and the initiative becomes operational
- **Time to first return** = Lead time period + Payback period (where applicable), giving the user a clear view of how long before the investment starts paying back

The MACC chart bars reflect the updated cost per tonne so initiatives with significant lead time costs are positioned more accurately on the curve.

**Why this priority**: Accurate cost modelling is essential for trustworthy decision-making. Without incorporating lead time costs, the MACC curve understates the true investment required for initiatives with significant pre-operational spend.

**Independent Test**: Can be fully tested by creating two identical initiatives — one with lead time costs and one without — and verifying that the cost per tonne, payback period, and MACC chart positioning differ appropriately.

**Acceptance Scenarios**:

1. **Given** an initiative with CapEx £100,000, OpEx -£20,000/year, lifespan 10 years, reduction 500 tCO₂e/year, and lead time cost £25,000, **When** the system computes cost per tonne, **Then** the result uses the formula (£25,000 + £100,000 + (-£20,000 × 10)) / 500 = -£150/tCO₂e
2. **Given** an initiative with lead time cost £0 and lead time period 0 months, **When** the system computes cost per tonne, **Then** the result matches the existing formula exactly (backward compatible)
3. **Given** an initiative with OpEx savings (negative OpEx) and a lead time of 12 months, **When** the system computes the time to first return, **Then** it shows lead time period (12 months) + payback years, giving the total time from investment decision to break-even
4. **Given** an initiative with positive OpEx (no savings) and a lead time, **When** the system computes payback, **Then** time to first return is shown as N/A (no payback regardless of lead time)
5. **Given** the MACC chart displays multiple initiatives, **When** some initiatives have lead time costs, **Then** their bar heights (cost per tonne) and sort order reflect the updated total lifecycle cost

---

### User Story 3 - Visualise Lead Time Impact on MACC Chart (Priority: P3)

As a sustainability expert, I want the MACC chart to visually distinguish between the lead time investment portion and the operational cost portion of each initiative, so that I can quickly identify which initiatives require significant upfront pre-operational investment.

On the MACC chart, each initiative bar can optionally show a visual indicator (such as a colour-coded segment or annotation) representing the proportion of cost per tonne attributable to lead time investment versus operational lifecycle cost. A tooltip or detail panel shows the lead time breakdown when hovering over or selecting a bar.

**Why this priority**: Visual distinction of lead time costs helps users quickly assess which initiatives are "ready to go" versus which require significant upfront planning and pre-operational investment, aiding prioritisation decisions.

**Independent Test**: Can be fully tested by creating initiatives with varying lead time costs and verifying that the MACC chart displays the lead time cost proportion visually and in tooltips.

**Acceptance Scenarios**:

1. **Given** an initiative with a lead time cost representing more than 10% of total lifecycle cost, **When** the user views the MACC chart, **Then** the bar shows a visual indicator of the lead time cost proportion
2. **Given** the user hovers over an initiative bar on the MACC chart, **When** the tooltip appears, **Then** it shows a breakdown: lead time cost, CapEx, OpEx (total over lifespan), and the resulting cost per tonne
3. **Given** an initiative with zero lead time cost, **When** the user views the MACC chart, **Then** no lead time indicator is shown on that bar (clean, uncluttered appearance)
4. **Given** the user is comparing initiatives on the MACC chart, **When** they look at the visual indicators, **Then** they can quickly identify which initiatives have the highest proportion of lead time investment

---

### User Story 4 - Lead Time Timeline View (Priority: P4)

As a sustainability expert, I want to see a timeline view showing when each initiative's lead time ends and abatement begins, so that I can plan my portfolio of initiatives with realistic implementation schedules.

A summary view (accessible from the initiatives list or MACC page) shows initiatives plotted on a timeline with their lead time phase and operational phase clearly marked. This helps the user understand the sequencing and overlap of multiple initiatives.

**Why this priority**: While not essential for core cost modelling, the timeline view adds significant planning value by helping users understand when abatement benefits will actually materialise across their initiative portfolio.

**Independent Test**: Can be fully tested by creating multiple initiatives with different lead times and verifying they appear on a timeline with correct phasing.

**Acceptance Scenarios**:

1. **Given** the user has multiple initiatives with varying lead times, **When** they view the timeline, **Then** each initiative shows a lead time phase (pre-operational) and an operational phase with clear visual distinction
2. **Given** an initiative has a lead time of 24 months and a lifespan of 10 years, **When** the user views the timeline, **Then** the total initiative span shows 2 years of lead time followed by 10 years of operation
3. **Given** the user is viewing the timeline, **When** they hover over an initiative, **Then** they see key details: lead time period, lead time cost, start of abatement, annual reduction, and total lifecycle cost

---

### Edge Cases

- What happens when a user sets a very long lead time (e.g., 120 months / 10 years) that exceeds the lifespan? The system should accept the values but display a warning that lead time exceeds lifespan, as this may indicate a data entry error.
- What happens when lead time cost is entered but lead time period is 0? The system should accept this (representing immediate costs like feasibility studies with no implementation delay) but show an informational note that no delay period is associated.
- What happens when lead time period is entered but lead time cost is 0? The system should accept this (representing implementation delays that don't incur additional direct cost beyond CapEx/OpEx).
- How does lead time affect AI-suggested initiatives? AI suggestions should include estimated lead time period and costs where the AI has sufficient context, with confidence indicators for these estimates.
- What happens to existing initiatives when this feature is deployed? All existing initiatives default to 0 months lead time and £0 lead time cost, preserving current behaviour exactly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to specify a lead time period (in whole months, minimum 0) when creating or editing an initiative
- **FR-002**: System MUST allow users to specify a lead time cost in GBP (minimum £0) when creating or editing an initiative
- **FR-003**: System MUST default lead time period to 0 months and lead time cost to £0 for new initiatives
- **FR-004**: System MUST incorporate lead time cost into the lifecycle cost formula: total lifecycle cost = lead time cost + CapEx + (OpEx annual × lifespan years)
- **FR-005**: System MUST recalculate cost per tonne using the extended lifecycle cost formula
- **FR-006**: System MUST compute and display "time to first return" as lead time period plus payback years (when payback is applicable)
- **FR-007**: System MUST display time to first return as N/A when OpEx is zero or positive (no savings to generate payback)
- **FR-008**: System MUST display lead time period and lead time cost on the initiative detail view
- **FR-009**: System MUST reflect updated cost per tonne in MACC chart bar positioning and sorting
- **FR-010**: System MUST show a warning when lead time period exceeds the initiative's lifespan
- **FR-011**: System MUST preserve backward compatibility — existing initiatives with no lead time data MUST behave identically to the current system
- **FR-012**: System MUST display lead time cost breakdown in MACC chart tooltips
- **FR-013**: System MUST include lead time fields in initiative list/summary views where cost data is already shown
- **FR-014**: System MUST validate that lead time period is a non-negative whole number (months)
- **FR-015**: System MUST validate that lead time cost is a non-negative numeric value

### Key Entities

- **AbatementInitiative** (extended): The core initiative entity gains two new attributes — `lead_time_months` (integer, default 0) representing the pre-operational implementation period, and `lead_time_cost_gbp` (float, default 0.0) representing costs incurred during that period. A new derived attribute `time_to_first_return` combines lead time with payback period.
- **MACCBar** (extended): The MACC chart bar data gains `lead_time_cost_gbp` and `lead_time_months` to support visual breakdown of cost components. A `lead_time_cost_proportion` (float, 0.0–1.0) indicates what fraction of total lifecycle cost comes from lead time investment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can define lead time period and cost for any initiative in under 30 seconds (no more than 2 additional fields to complete)
- **SC-002**: Cost per tonne calculations for initiatives with lead time costs match the extended formula with 100% accuracy
- **SC-003**: Existing initiatives (with no lead time data) produce identical cost per tonne and payback values as before the feature is deployed
- **SC-004**: Users can identify the lead time cost proportion for any initiative on the MACC chart within 2 interactions (hover/click)
- **SC-005**: 100% of initiatives display correct time to first return values where applicable
- **SC-006**: Users report improved confidence in investment timing decisions when planning abatement portfolios (qualitative, assessed via user feedback)

## Assumptions

- Lead time period is captured in whole months, as this is the standard granularity for project planning in sustainability contexts. Sub-month precision is not required.
- Lead time cost represents all pre-operational expenditure (feasibility studies, permits, procurement, construction, training) as a single lump sum. Detailed phased cost breakdowns within the lead time period are out of scope for this feature.
- The existing CapEx field continues to represent the primary capital investment for the initiative itself (e.g., equipment purchase). Lead time cost is a separate, additional expenditure.
- Currency remains GBP (£) consistent with the existing system. The new field uses the `_gbp` suffix convention.
- AI-suggested initiatives may include lead time estimates in future iterations, but this feature focuses on manual entry. AI integration with lead time is a follow-on enhancement.
- The timeline view (P4) uses a simple horizontal bar chart and does not require interactive Gantt chart functionality.
