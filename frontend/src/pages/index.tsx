// ─── Stub pages for routing ──────────────────────────────────────────────────
import { Header } from '../components/layout/Header';

// EmissionsPage lives in its own file
export { EmissionsPage } from './EmissionsPage';

// MACCPage lives in its own file
export { MACCPage } from './MACCPage';

// ── Scenarios ─────────────────────────────────────────────────────────────────
export { ScenariosPage } from './ScenariosPage';

// ── Context ───────────────────────────────────────────────────────────────────
export { ContextPage } from './ContextPage';

// ── AI Suggestions ────────────────────────────────────────────────────────────
export function SuggestionsPage() {
  return (
    <>
      <Header title="AI Suggestions" subtitle="AI-generated abatement initiative recommendations" />
      <div className="p-6">
        <p className="text-sm text-gray-500">Coming soon — Phase 7 (US5)</p>
      </div>
    </>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
export function SettingsPage() {
  return (
    <>
      <Header title="Settings" subtitle="Organisation and integration settings" />
      <div className="p-6">
        <p className="text-sm text-gray-500">Coming soon — Phase 8 (US6)</p>
      </div>
    </>
  );
}
