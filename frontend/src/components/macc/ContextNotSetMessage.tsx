/**
 * ContextNotSetMessage — Informational banner shown when GET /context returns 404.
 *
 * Includes a link to the Context page so users can set up their organisation
 * profile. Does NOT block target CRUD (FR-015).
 */

import { Link } from 'react-router-dom';

export function ContextNotSetMessage() {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3"
    >
      <svg
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="text-sm">
        <p className="font-medium text-amber-900">Organisation profile not set up</p>
        <p className="mt-0.5 text-amber-800">
          You can still create and manage targets below. To enable AI-powered suggestions
          and reporting,{' '}
          <Link to="/context" className="font-medium underline hover:text-amber-900">
            set up your organisation profile
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
