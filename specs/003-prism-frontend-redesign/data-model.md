# Data Model: Prism Design System Migration & Navigation Redesign

**Feature**: 003-prism-frontend-redesign
**Date**: 4 March 2026

## Overview

This is a frontend-only migration. No new database entities or API endpoints are introduced. This document defines the frontend routing model, tab state model, and component hierarchy changes.

## Routing Model

### Current Routes (5 sidebar items)

| Route | Page Component | Sidebar Item |
|-------|---------------|-------------|
| `/` | Redirect → `/emissions` | — |
| `/emissions` | `EmissionsPage` | Emissions |
| `/macc` | `MACCPage` | MACC Chart |
| `/scenarios` | `ScenariosPage` | Scenarios |
| `/context` | `ContextPage` | Context |
| `/settings` | `SettingsPage` | Settings |
| `*` | Redirect → `/emissions` | — |

### Target Routes (4 sidebar items)

| Route | Page Component | Sidebar Item | Notes |
|-------|---------------|-------------|-------|
| `/` | Redirect → `/emissions` | — | Unchanged |
| `/emissions` | `EmissionsPage` | Emissions | Unchanged |
| `/macc` | `MACCModellingPage` | MACC Modelling | Tabbed hub (default: `?tab=initiatives`; missing/invalid `?tab=` normalized to `?tab=initiatives` via URL rewrite) |
| `/macc?tab=initiatives` | Initiatives tab | MACC Modelling | Unified MACC modelling workspace: D3 chart, AI suggestions, initiative table and detail panel |
| `/macc?tab=scenarios` | Scenarios tab | MACC Modelling | Cards + compare + manage |
| `/macc?tab=targets` | Targets tab | MACC Modelling | Target list + add form |
| `/context` | `ContextPage` | Context | Org profile only (targets removed) |
| `/settings` | `SettingsPage` | Settings | Unchanged |
| `/scenarios` | Redirect → `/macc?tab=scenarios` | — | Legacy redirect |
| `/scenarios/*` | Redirect → `/macc?tab=scenarios` | — | Legacy deep link catch-all |
| `*` | Redirect → `/emissions` | — | Unchanged |

## Tab State Model

### Type Definitions

```typescript
/**
 * Valid tab identifiers for the MACC Modelling page.
 * Used as the value of the `?tab=` query parameter.
 */
type MACCModellingTab = 'initiatives' | 'scenarios' | 'targets';

/**
 * Configuration for a single tab in the MACC Modelling hub.
 */
interface TabConfig {
  /** URL-safe identifier used in ?tab= parameter */
  id: MACCModellingTab;
  /** Human-readable label shown in the tab bar */
  label: string;
  /** React component rendered as the tab panel content */
  content: React.ComponentType;
}

/** Default tab when no ?tab= parameter is present (FR-011) */
const DEFAULT_TAB: MACCModellingTab = 'initiatives';
```

### Tab Configuration

| Tab ID | Label | Source Component | Origin |
|--------|-------|-----------------|--------|
| `initiatives` | Initiatives | `InitiativesTab` | Extracted from `MACCPage.tsx` (full content: MACC chart, AI suggestions, initiative table, detail panel, and all associated modals — the unified MACC modelling workspace) |
| `scenarios` | Scenarios | `ScenariosTab` | Moved from `ScenariosPage.tsx` (cards + compare + manage) |
| `targets` | Targets | `TargetsTab` | Moved from `ContextPage.tsx` (list + add form) |

## Navigation Model

### Sidebar Items — Before vs After

| # | Before | After |
|---|--------|-------|
| 1 | Emissions → `/emissions` | Emissions → `/emissions` |
| 2 | MACC Chart → `/macc` | MACC Modelling → `/macc` |
| 3 | Scenarios → `/scenarios` | Context → `/context` |
| 4 | Context → `/context` | Settings → `/settings` |
| 5 | Settings → `/settings` | *(removed)* |

## Component Hierarchy Changes

### MACCPage → MACCModellingPage

**Before** (`MACCPage.tsx` — 670 lines, single page):
```
MACCPage
├── Header ("MACC Chart")
├── MACCChart (D3 interactive SVG)
├── Grid (xl:grid-cols-5)
│   ├── InitiativesTable (3 cols — filterable, sortable)
│   └── InitiativeDetail (2 cols — selected initiative panel)
├── CreationChoiceModal (manual vs AI)
├── EditInitiativeModal
├── AISuggestionsModal
└── SuggestionLoading
```

**After** (`MACCModellingPage.tsx` — tabbed hub):
```
MACCModellingPage
├── Header ("MACC Modelling")
├── TabBar [initiatives | scenarios | targets]
└── TabPanels (all mounted; inactive hidden via display:none)
    ├── InitiativesTab (unified MACC modelling workspace)
    │   ├── MACCChart (D3 interactive SVG)
    │   ├── TargetOverlay (D3 overlay)
    │   ├── SuggestionRequest
    │   ├── AcceptModal
    │   ├── DismissModal
    │   ├── InitiativesTable
    │   ├── InitiativeDetail
    │   ├── CreationChoiceModal
    │   └── EditInitiativeModal
    ├── ScenariosTab
    │   ├── ScenarioCardGrid
    │   ├── ComparePanel
    │   ├── CreateScenarioModal
    │   └── ScenarioManager (inline modal)
    └── TargetsTab
        ├── TargetList
        ├── TargetForm (modal)
        └── ContextNotSetMessage (shown when GET /context returns 404; hidden once any context record exists — FR-015)
```

### ContextPage — Targets Removed

**Before**:
```
ContextPage
├── Header ("Organisational Context")
├── ContextForm (organisation profile)
└── Targets Section
    ├── TargetList
    └── TargetForm (modal)
```

**After**:
```
ContextPage
├── Header ("Organisational Context")
└── ContextForm (organisation profile)
```

## State Management

| State | Storage | Survives Tab Switch | Survives Refresh |
|-------|---------|-------------------|-----------------|
| Active tab | URL `?tab=` param | Yes | Yes |
| Initiative list | TanStack Query cache | Yes (shared) | Re-fetched |
| Scenario list | TanStack Query cache | Yes (shared) | Re-fetched |
| Target list | TanStack Query cache | Yes (shared) | Re-fetched |
| Selected initiative | Local component state | Yes (hidden mount) | No |
| Form field values | Local component state | Yes (hidden mount) | No |
| Open modals | Local component state | Dismissed on switch | No |
| Compare selections | Local component state | Reset on leave | No |
| Filter/sort state | Local component state | Reset on leave | No |

## Backend Entities (unchanged)

No changes to backend models or API endpoints. The following entities are consumed as-is via REST:

| Entity | API Endpoint | Used In Tab(s) |
|--------|-------------|---------------|
| Initiative | `GET/POST/PUT/DELETE /api/v1/initiatives` | Initiatives, Scenarios, MACC Chart |
| Scenario | `GET/POST/PUT/DELETE /api/v1/scenarios` | Scenarios |
| Target | `GET/POST/PUT/DELETE /api/v1/context/targets` | Targets, MACC Chart |
| Context | `GET/PUT /api/v1/context` | Context page, Targets tab (informational banner when 404; target CRUD always available) |
| Emission | `GET /api/v1/emissions` | Emissions page, MACC Chart |
