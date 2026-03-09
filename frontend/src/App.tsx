// ─── App Router ───────────────────────────────────────────────────────────────
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PageLayout } from './components/layout/PageLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PrismSpinner } from './prism';

// Route-level code splitting: each page is its own async chunk.
// This keeps the initial JS payload minimal (FR-017: < +50 kB over baseline).
const EmissionsPage = lazy(() => import('./pages/EmissionsPage').then((m) => ({ default: m.EmissionsPage })));
const MACCModellingPage = lazy(() => import('./pages/MACCModellingPage').then((m) => ({ default: m.MACCModellingPage })));
const ContextPage = lazy(() => import('./pages/ContextPage').then((m) => ({ default: m.ContextPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function PageFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <PrismSpinner size="medium" />
    </div>
  );
}

export default function App() {
  return (
    <PageLayout>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/emissions" replace />} />

            {/* Main pages */}
            <Route path="/emissions" element={<EmissionsPage />} />
            <Route path="/macc" element={<MACCModellingPage />} />
            <Route path="/context" element={<ContextPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Legacy redirects (Phase 5/US3 will remove old entries) */}
            <Route path="/scenarios" element={<Navigate to="/macc?tab=scenarios" replace />} />
            <Route path="/scenarios/*" element={<Navigate to="/macc?tab=scenarios" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/emissions" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </PageLayout>
  );
}

