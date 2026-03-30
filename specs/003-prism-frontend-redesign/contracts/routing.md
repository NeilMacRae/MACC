# Contract: URL Routing

**Feature**: 003-prism-frontend-redesign
**Type**: Frontend routing contract

## Route Table

All routes are handled client-side by React Router v6.

| Method | Path | Behaviour | Query Params |
|--------|------|-----------|-------------|
| GET | `/` | Redirect → `/emissions` | — |
| GET | `/emissions` | Render `EmissionsPage` | — |
| GET | `/macc` | Render `MACCModellingPage` | `?tab={initiatives\|scenarios\|targets}` (default: `initiatives`) |
| GET | `/context` | Render `ContextPage` (org profile only) | — |
| GET | `/settings` | Render `SettingsPage` | — |
| GET | `/scenarios` | Redirect → `/macc?tab=scenarios` | — |
| GET | `/scenarios/*` | Redirect → `/macc?tab=scenarios` | — |
| GET | `*` | Redirect → `/emissions` | — |

## Query Parameter Contract — MACC Modelling Tabs

| Parameter | Key | Values | Default | Persistence |
|-----------|-----|--------|---------|-------------|
| Active tab | `tab` | `initiatives`, `scenarios`, `targets` | `initiatives` | URL (survives refresh) |

### Behaviour Rules

1. **Missing `?tab=`**: Normalize URL to `?tab=initiatives` and display Initiatives tab (FR-011 — active URL rewrite via `setSearchParams({ tab: 'initiatives' }, { replace: true })`)
2. **Invalid `?tab=` value**: Normalize URL to `?tab=initiatives` and display Initiatives tab (same rewrite; not a silent default)
3. **Tab switch**: Update `?tab=` with `replace: true` (no history stack pollution for tab-only navigation)
4. ~~**Browser back/forward**: Navigates between tab changes~~ *(removed — tab switches use `replace: true` and do not push history entries)*
5. **Direct URL access**: Tab renders immediately from URL state

## Redirect Rules

| From | To | Type | Rationale |
|------|----|------|-----------|
| `/scenarios` | `/macc?tab=scenarios` | `replace` | Sidebar item removed; preserve bookmarks (FR-005) |
| `/scenarios/*` | `/macc?tab=scenarios` | `replace` | Catch deep links to specific scenarios |
| `/` | `/emissions` | `replace` | Default landing page |
| `*` (unmatched) | `/emissions` | `replace` | Fallback for unknown routes |

## Sidebar Navigation Items

| Order | Label | Route | Icon | Active When |
|-------|-------|-------|------|-------------|
| 1 | Emissions | `/emissions` | Bar chart | Path starts with `/emissions` |
| 2 | MACC Modelling | `/macc` | Chart square | Path starts with `/macc` |
| 3 | Context | `/context` | Globe | Path starts with `/context` |
| 4 | Settings | `/settings` | Cog | Path starts with `/settings` |
