// ─── Vitest / Testing Library global setup ───────────────────────────────────
import '@testing-library/jest-dom';

// jsdom (Node) doesn't ship ResizeObserver, but Prism web components rely on it.
// A minimal stub is sufficient for our unit tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
	class ResizeObserver {
		observe(_target: Element) {}
		unobserve(_target: Element) {}
		disconnect() {}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(globalThis as any).ResizeObserver = ResizeObserver;
}
