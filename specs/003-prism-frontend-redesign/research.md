# Research: Prism Design System Migration & Navigation Redesign

**Feature**: 003-prism-frontend-redesign
**Date**: 4 March 2026

## Research Tasks

### 1. Prism Component Library — Available Components

**Task**: Determine what components `@ecoonline/prism-web-components-react` provides and map them to existing Tailwind components.

**Decision**: Use Prism components where available; build custom Prism-aligned components where not.

**Rationale**: The library is an internal EcoOnline package. The component inventory must be performed after installation in Phase 1. The spec and constitution mandate a Prism-first approach — check for every UI pattern before building custom.

**Expected components** (based on typical design system scope):
- Buttons (variants: primary, secondary, danger, ghost, icon-only)
- Form inputs (text, select, textarea, checkbox, radio, toggle)
- Modal/Dialog
- Table/DataGrid
- Card
- Badge/Tag
- Loading spinner/skeleton
- Navigation (sidebar, breadcrumb, tabs)
- Layout (container, grid, stack)
- Typography (heading, text, label)
- Alert/Banner
- Tooltip
- Dropdown/Menu

**Verified component mapping** (audited Phase 1 — 5 March 2026):

Full export list from `@ecoonline/prism-web-components-react@1.0.57`:
`PrismAccordion`, `PrismAlert`, `PrismAvatar`, `PrismBadge`, `PrismBreadcrumb`, `PrismBreadcrumbItem`, `PrismButton`, `PrismCheckbox`, `PrismCheckboxOption`, `PrismColourPicker`, `PrismDatePicker`, `PrismDialog`, `PrismDivider`, `PrismDrawer`, `PrismDropdown`, `PrismExpandable`, `PrismFileInput`, `PrismHeader`, `PrismHeaderAppLauncher`, `PrismHeaderMenu`, `PrismHeaderMenuItem`, `PrismIcon`, `PrismIconButton`, `PrismInput`, `PrismLabel`, `PrismLazyDropdown`, `PrismLogomark`, `PrismMenu`, `PrismMenuItem`, `PrismMenuLabel`, `PrismOption`, `PrismOptionShadow`, `PrismProgressBar`, `PrismProgressRing`, `PrismRadio`, `PrismRadioOption`, `PrismRange`, `PrismRating`, `PrismRelativeTime`, `PrismSelect`, `PrismSelectShadow`, `PrismSkeleton`, `PrismSpinner`, `PrismSplitPanel`, `PrismTab`, `PrismTabGroup`, `PrismTabPanel`, `PrismTag`, `PrismTextarea`, `PrismToast`, `PrismTooltip`, `PrismWrapper`

| Existing Component | File | Prism Equivalent (verified) | Notes |
|-------------------|------|----------------------------|-------|
| `Button` | `components/common/Button.tsx` | `PrismButton` | variants: primary, secondary (--secondary), critical (--critical) |
| `Modal` | `components/common/Modal.tsx` | `PrismDialog` | ✅ confirmed |
| `DataTable` | `components/common/DataTable.tsx` | **None — custom** | No PrismTable in package; build custom Prism-aligned |
| `Badge` | `components/common/Badge.tsx` | `PrismBadge` | ✅ confirmed |
| `QualityBadge` | `components/common/QualityBadge.tsx` | `PrismTag` | Tag variant suits quality labels |
| `LoadingSpinner` | `components/common/LoadingSpinner.tsx` | `PrismSpinner` | ✅ confirmed; `PrismSkeleton` also available |
| `EmptyState` | `components/common/EmptyState.tsx` | **Custom (Prism-aligned)** | No PrismEmptyState; compose with PrismIcon + text |
| Inline SVG icons | `components/layout/Sidebar.tsx` + others | `PrismIcon` | ✅ confirmed |
| `Sidebar` nav | `components/layout/Sidebar.tsx` | **Custom (Prism-aligned)** | No PrismSideNav; retain custom sidebar, use Prism tokens |
| `Header` | `components/layout/Header.tsx` | `PrismHeader` | ✅ confirmed; `PrismHeaderMenu` + `PrismHeaderMenuItem` available |
| Form inputs (inline) | Various files | `PrismInput`, `PrismSelect`, `PrismTextarea` | ✅ all confirmed |
| Tab bar (new) | `components/macc/TabBar.tsx` | `PrismTabGroup` / `PrismTab` / `PrismTabPanel` | ✅ native Prism tabs available |
| Alert/banner | Various files | `PrismAlert` | ✅ confirmed |
| Tooltip | Various files | `PrismTooltip` | ✅ confirmed |
| Dropdown/Menu | Various files | `PrismDropdown`, `PrismMenu` | ✅ confirmed |

**Setup required**: Import `@ecoonline/prism-web-components/dist/style.css` in `frontend/src/main.tsx` — this injects all component CSS, design tokens (CSS variables), and Shoelace/IBM Plex Sans font configuration. No `PrismWrapper` provider wrapping is required; components work standalone.

**Alternatives considered**:
- Material UI, Chakra, shadcn/ui → **Rejected**: constitution explicitly prohibits competing UI libraries (Principle III)
- Build all components from scratch in Tailwind → **Rejected**: constitution mandates Prism-first approach

---

### 2. Tab URL State Management — React Router Integration

**Task**: Determine the best approach for encoding tab state in the URL.

**Decision**: Use `?tab=` query parameter with React Router's `useSearchParams` hook.

**Rationale**: User confirmed Option B. Query parameters are the simplest approach for tab state:
- `useSearchParams()` from react-router-dom 6.x provides read/write access
- No nested routes or route configuration changes needed
- Works naturally with `<Navigate>` for redirects
- Browser back/forward works automatically
- Bookmarkable/shareable URLs

**Implementation pattern**:

```tsx
const VALID_TABS = new Set(['chart', 'initiatives', 'scenarios', 'targets']);

const [searchParams, setSearchParams] = useSearchParams();
const rawTab = searchParams.get('tab');
const activeTab = (VALID_TABS.has(rawTab ?? '') 
  ? rawTab 
  : 'chart') as MACCModellingTab;

// FR-011: Normalize URL when tab param is missing or unrecognized
useEffect(() => {
  if (!rawTab || !VALID_TABS.has(rawTab)) {
    setSearchParams({ tab: 'chart' }, { replace: true });
  }
}, [rawTab, setSearchParams]);

const setTab = (tab: MACCModellingTab) => {
  setSearchParams({ tab }, { replace: true });
};
```

**Note (spec clarification 2026-03-04, updated 2026-03-04)**: The application MUST actively rewrite the URL to `?tab=initiatives` when the parameter is missing or has an unrecognized value — this is URL normalization, not just a silent default.

**Alternatives considered**:
- **Option A**: Nested routes (`/macc/initiatives`, `/macc/scenarios`) → Rejected: over-engineering for tabs; complicates redirects and route config
- **Option C**: Hash fragments (`/macc#scenarios`) → Rejected: conflicts with in-page anchors; less standard for app state
- **Option D**: Internal state only (no URL) → Rejected: violates FR-004 (URL must reflect active tab)

---

### 3. Tab State Preservation Strategy

**Task**: Determine how to preserve tab content state during tab switching (FR-012).

**Decision**: Conditional visibility — render all tab panels, hide inactive with `display: none`.

**Rationale**: FR-012 requires form field values and selected entities to be preserved when switching tabs.

**Approach**:
- All three tab panels are mounted simultaneously
- Only the active tab has `display: block`; inactive tabs have `display: none`
- React component state (form values, selections) is preserved because components stay mounted
- TanStack Query handles data caching across tabs automatically
- Open modals are dismissed on tab switch (per FR-012)
- Comparison panel selections and filtering states reset on tab leave (per FR-012)

**Implementation pattern**:

```tsx
{TABS.map((tab) => (
  <div
    key={tab.id}
    role="tabpanel"
    id={`panel-${tab.id}`}
    aria-labelledby={`tab-${tab.id}`}
    style={{ display: activeTab === tab.id ? 'block' : 'none' }}
  >
    <tab.content />
  </div>
))}
```

**Alternatives considered**:
- Unmount/remount with lifted state → Rejected: requires explicit state management for every piece of tab state; brittle
- Redux/Zustand for tab state → Rejected: over-engineering; TanStack Query + local state sufficient
- Session storage persistence → Rejected: spec explicitly states in-memory state only

---

### 4. Bundle Size Impact Assessment

**Task**: Assess potential bundle size impact of adding `@ecoonline/prism-web-components-react`.

**Decision**: Measure empirically in Phase 1; enforce < 50KB limit per FR-017.

**Rationale**: `@ecoonline/prism-web-components-react` is a web components library with React wrappers. Typical impact:
- Web components are often tree-shakeable (import only what you use)
- React wrappers add minimal overhead (~1-2KB per component)
- Replacing existing Tailwind-based components removes some code, partially offsetting the addition
- Tailwind CSS purging means unused utility classes are already removed

**Measurement plan**:
1. Record baseline production bundle size before Prism installation
2. Install Prism and import one component — measure delta
3. After each phase, measure cumulative delta
4. If approaching 50KB limit, review imports for tree-shaking opportunities

**Baseline recorded — 5 March 2026** (before Prism CSS import, `npm run build`):

| Chunk | Raw | Gzip |
|-------|-----|------|
| `dist/index.html` | 0.46 kB | 0.30 kB |
| `dist/assets/index-*.css` | 29.99 kB | 5.67 kB |
| `dist/assets/index-*.js` | 355.63 kB | 102.30 kB |

**Budget**: JS gzip must stay ≤ 152.30 kB (+50 kB over 102.30 kB baseline). CSS gzip must stay ≤ 55.67 kB (+50 kB over 5.67 kB baseline).

**Current measured — 5 March 2026** (after US2 Prism adoption and bundle-size remediation, `npm run build`):

| Chunk | Raw | Gzip |
|-------|-----|------|
| `dist/index.html` | 0.46 kB | 0.30 kB |
| `dist/assets/index-*.css` | 111.88 kB | 19.06 kB |
| `dist/assets/index-*.js` | 512.10 kB | 149.87 kB |

**Delta vs baseline**:
- JS gzip: +47.57 kB (PASS — under +50 kB)
- CSS gzip: +13.39 kB (PASS — under +50 kB)

**Final measured — 9 March 2026** (after Phase 9 Polish — route-based code splitting applied in `App.tsx` using `React.lazy()`; each page is now an async chunk):

| Chunk | Raw | Gzip | Notes |
|-------|-----|------|-------|
| `dist/index.html` | 0.46 kB | 0.30 kB | |
| `dist/assets/index-*.css` | 110.70 kB | 18.91 kB | |
| `dist/assets/index-*.js` | 391.27 kB | 118.35 kB | **Initial bundle** (eagerly loaded) |
| `dist/assets/MACCModellingPage-*.js` | 78.99 kB | 19.60 kB | Lazy — loaded on `/macc` |
| `dist/assets/EmissionsPage-*.js` | 21.20 kB | 5.67 kB | Lazy — loaded on `/emissions` |
| `dist/assets/Badge-*.js` | 19.33 kB | 7.96 kB | Lazy shared chunk |
| `dist/assets/api-*.js` | 12.08 kB | 4.60 kB | Lazy shared chunk |
| `dist/assets/ContextPage-*.js` | 6.45 kB | 2.38 kB | Lazy — loaded on `/context` |
| `dist/assets/useMutation-*.js` | 3.10 kB | 1.27 kB | Lazy shared chunk |
| `dist/assets/Header-*.js` | 0.55 kB | 0.32 kB | Lazy shared chunk |
| `dist/assets/SettingsPage-*.js` | 0.36 kB | 0.27 kB | Lazy — loaded on `/settings` |

**Delta vs baseline (initial bundle only)**:
- JS gzip (initial): +16.05 kB (PASS — well under +50 kB)
- CSS gzip: +13.24 kB (PASS — under +50 kB)

**Implementation note**: Route-based `React.lazy()` splitting was applied in Phase 9 to satisfy FR-017. The monolithic bundle reached 154.90 kB gzip after all phases (2.60 kB over the +50 kB budget). Splitting by route reduces the initial payload to 118.35 kB gzip (+16 kB over baseline). Each page chunk loads on first navigation to that route. A `<Suspense>` fallback with `PrismSpinner` handles the async load.

**Contingency** (if bundle exceeds limit):
- Lazy-load Prism components per route/tab using `React.lazy()`
- Audit for unused Prism component imports
- Use Vite's `rollup-plugin-visualizer` to identify large chunks

---

### 5. Legacy Route Redirect Strategy

**Task**: Determine how to handle redirects for removed routes.

**Decision**: Use React Router `<Navigate>` components with query parameter forwarding.

**Rationale**: Simple, declarative, works within the existing React Router setup.

**Implementation**:

```tsx
// In App.tsx routes
<Route
  path="/scenarios"
  element={<Navigate to="/macc?tab=scenarios" replace />}
/>
<Route
  path="/scenarios/*"
  element={<Navigate to="/macc?tab=scenarios" replace />}
/>
```

**Alternatives considered**:
- Server-side redirects → Rejected: frontend-only SPA; no server routing available
- Keep old routes working indefinitely → Rejected: creates confusing dual navigation paths

---

### 6. Prism Web Components + React Integration Pattern

**Task**: Understand how `prism-web-components-react` integrates with React.

**Decision**: Use the library as standard React components (it provides React wrappers).

**Rationale**: The package name `prism-web-components-react` indicates React wrappers around web components — a common pattern (cf. Ionic React, Shoelace React). The React wrappers handle:
- Property binding (camelCase props → web component attributes)
- Event binding (synthetic events → custom events)
- Ref forwarding
- TypeScript type definitions

**Expected usage pattern**:

```tsx
import { PrismButton, PrismModal, PrismInput } from '@ecoonline/prism-web-components-react';

<PrismButton variant="primary" onClick={handleClick}>
  Save
</PrismButton>
```

**Action**: Verify actual import patterns and component names after installation in Phase 1. Document any required setup (theme provider, CSS imports, font loading).
