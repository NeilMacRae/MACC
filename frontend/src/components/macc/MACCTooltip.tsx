/**
 * MACCTooltip — hover card displayed over a MACC bar.
 *
 * Rendered as an absolutely-positioned div. The parent (MACCChart) passes
 * x/y screen coordinates to position it.
 */

import type { MACCBar } from "../../types/initiatives";

interface Props {
  bar: MACCBar;
  x: number;
  y: number;
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const CONFIDENCE_COLOURS: Record<string, string> = {
  high: "text-emerald-600",
  medium: "text-amber-600",
  low: "text-red-600",
};

export function MACCTooltip({ bar, x, y }: Props) {
  const isNeg = bar.cost_per_tonne < 0;

  return (
    <div
      className="pointer-events-none absolute z-50 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl text-sm"
      style={{ left: x + 8, top: y - 8 }}
    >
      {/* Name */}
      <p className="font-semibold text-gray-900 truncate">{bar.name}</p>

      {/* Status + type */}
      <div className="mt-1 flex gap-2">
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 capitalize">
          {bar.status.replace("_", " ")}
        </span>
        {bar.initiative_type === "ai_suggested" && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
            AI
          </span>
        )}
      </div>

      <dl className="mt-2 space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <dt>Cost / tCO₂e</dt>
          <dd className={`font-medium ${isNeg ? "text-emerald-600" : "text-gray-900"}`}>
            {isNeg ? "−" : ""}£{fmt(Math.abs(bar.cost_per_tonne), 0)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Abatement (annual)</dt>
          <dd className="font-medium text-gray-900">{fmt(bar.co2e_reduction_annual_tonnes, 1)} tCO₂e</dd>
        </div>
        <div className="flex justify-between">
          <dt>CapEx</dt>
          <dd className="font-medium text-gray-900">£{fmt(bar.capex_gbp, 0)}</dd>
        </div>
        {bar.opex_annual_gbp != null && (
          <div className="flex justify-between">
            <dt>OpEx (annual)</dt>
            <dd className={`font-medium ${bar.opex_annual_gbp < 0 ? "text-emerald-600" : "text-gray-900"}`}>
              {bar.opex_annual_gbp < 0 ? "−" : "+"}£{fmt(Math.abs(bar.opex_annual_gbp), 0)}/yr
            </dd>
          </div>
        )}
        {bar.confidence && (
          <div className="flex justify-between">
            <dt>Confidence</dt>
            <dd className={`font-medium capitalize ${CONFIDENCE_COLOURS[bar.confidence] ?? ""}`}>
              {bar.confidence}
            </dd>
          </div>
        )}
        {bar.owner && (
          <div className="flex justify-between">
            <dt>Owner</dt>
            <dd className="font-medium text-gray-900 truncate max-w-[130px]">{bar.owner}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
