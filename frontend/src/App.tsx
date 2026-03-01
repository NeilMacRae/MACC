// ─── App Router ───────────────────────────────────────────────────────────────
import { Navigate, Route, Routes } from 'react-router-dom';
import { PageLayout } from './components/layout/PageLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import {
  EmissionsPage,
  MACCPage,
  ScenariosPage,
  ContextPage,
  SettingsPage,
} from './pages';

export default function App() {
  return (
    <PageLayout>
      <ErrorBoundary>
        <Routes>
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/emissions" replace />} />

          {/* Main pages */}
          <Route path="/emissions" element={<EmissionsPage />} />
          <Route path="/macc" element={<MACCPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
          <Route path="/context" element={<ContextPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/emissions" replace />} />
        </Routes>
      </ErrorBoundary>
    </PageLayout>
  );
}
