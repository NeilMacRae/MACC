# AI Suggestions API Contract

**Base path**: `/api/v1/ai`
**Auth**: JWT Bearer token required on all endpoints

---

## POST /api/v1/ai/suggestions

**Description**: Request AI-generated abatement initiative suggestions based on the organisation's emissions profile and context. This is a synchronous call that may take 5–15 seconds.

**Request Body**:
```json
{
  "scope_focus": [1, 2],
  "max_suggestions": 5,
  "budget_limit_gbp": 200000.0,
  "priority": "cost_effective",
  "additional_context": "We have roof space available for solar panels"
}
```

**Validation**:
- `scope_focus`: array of integers (1, 2, 3); default: all scopes
- `max_suggestions`: 1–10; default: 5
- `priority`: one of `"cost_effective"`, `"high_impact"`
- `budget_limit_gbp`: positive float (optional)

**Prerequisites**:
- Organisational context must exist
- At least one emission source with data must exist

**Response 200**:
```json
{
  "request_id": "uuid",
  "model": "gpt-4o-2024-08-06",
  "suggestions": [
    {
      "id": "uuid",
      "name": "Rooftop Solar PV Installation",
      "description": "Install 500kW solar PV system on available roof space to offset grid electricity consumption",
      "rationale": "Based on your Scope 2 emissions from grid electricity (4,500 tCO2e) and available roof space, a 500kW system could reduce emissions by approximately 350 tCO2e annually.",
      "estimated_capex_gbp": 175000.0,
      "estimated_opex_annual_gbp": -45000.0,
      "estimated_co2e_reduction_annual_tonnes": 350.0,
      "estimated_cost_per_tonne": 500.0,
      "estimated_payback_years": 3.9,
      "confidence": "medium",
      "confidence_notes": null,
      "target_scopes": [2],
      "target_source_ids": ["uuid-1"],
      "implementation_complexity": "medium",
      "typical_timeline_months": 6,
      "relevance_score": 0.92,
      "assumptions": [
        "Irish grid emission factor of 0.296 kgCO2/kWh",
        "500kW system producing ~450MWh/year",
        "25-year system lifespan"
      ],
      "activity_breakdown": null
    },
    {
      "id": "uuid-2",
      "name": "Fleet Electrification Programme",
      "description": "Replace diesel fleet vehicles with electric alternatives across manufacturing and logistics",
      "rationale": "Your Scope 1 fleet emissions across 3 activities represent 1,200 tCO2e. Electrification addresses multiple sites with a single programme.",
      "estimated_capex_gbp": 450000.0,
      "estimated_opex_annual_gbp": -85000.0,
      "estimated_co2e_reduction_annual_tonnes": 900.0,
      "estimated_cost_per_tonne": 500.0,
      "estimated_payback_years": 5.3,
      "confidence": "high",
      "confidence_notes": null,
      "target_scopes": [1],
      "target_source_ids": ["uuid-3", "uuid-4", "uuid-5"],
      "implementation_complexity": "high",
      "typical_timeline_months": 18,
      "relevance_score": 0.88,
      "assumptions": [
        "EV replacement ratio 1:1",
        "Average annual mileage 25,000 km per vehicle"
      ],
      "activity_breakdown": [
        {
          "activity": "Company vehicles - diesel",
          "target_source_ids": ["uuid-3"],
          "estimated_capex_gbp": 200000.0,
          "estimated_opex_annual_gbp": -40000.0,
          "estimated_co2e_reduction_annual_tonnes": 450.0
        },
        {
          "activity": "Delivery fleet - diesel",
          "target_source_ids": ["uuid-4"],
          "estimated_capex_gbp": 150000.0,
          "estimated_opex_annual_gbp": -30000.0,
          "estimated_co2e_reduction_annual_tonnes": 300.0
        },
        {
          "activity": "Forklift fleet - LPG",
          "target_source_ids": ["uuid-5"],
          "estimated_capex_gbp": 100000.0,
          "estimated_opex_annual_gbp": -15000.0,
          "estimated_co2e_reduction_annual_tonnes": 150.0
        }
      ]
    }
  ],
  "constraints_relaxed": null,
  "context_used": {
    "industry_sector": "Manufacturing",
    "total_emissions_co2e": 15000.0,
    "source_count": 12,
    "constraint_config_applied": true
  },
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Response Fields Notes**:
- `confidence`: `"high"`, `"medium"`, or `"low"`. Low-confidence suggestions are returned when constraints had to be relaxed.
- `confidence_notes`: `null` normally; a string explaining limitations when confidence is `"low"` (e.g., `"Budget constraint relaxed from £200k to £400k to find viable options"`)
- `activity_breakdown`: `null` for single-activity suggestions; array of per-activity breakdowns for multi-activity programme suggestions. Each breakdown includes `activity`, `target_source_ids`, and per-activity cost/saving/abatement figures. On acceptance, each breakdown item becomes a separate initiative.
- `constraints_relaxed`: `null` normally; object describing which constraints were relaxed at the response level (e.g., `{"budget_limit_gbp": {"original": 200000, "relaxed_to": 400000}, "reason": "No viable suggestions within original budget"}`).

---

## GET /api/v1/ai/suggestions

**Description**: List previous AI suggestion requests and their results.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| page_size | integer | No | Items per page (default: 20) |

**Response 200**:
```json
{
  "items": [
    {
      "request_id": "uuid",
      "scope_focus": [1, 2],
      "priority": "cost_effective",
      "suggestion_count": 5,
      "accepted_count": 2,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 3,
  "page": 1,
  "page_size": 20
}
```

---

## GET /api/v1/ai/suggestions/{request_id}

**Description**: Get full detail of a specific suggestion request and all its suggestions.

**Response 200**: Same as POST response body.

---

## POST /api/v1/ai/suggestions/{suggestion_id}/accept

**Description**: Accept an AI suggestion and convert it into one or more initiatives. For single-activity suggestions, creates one initiative. For multi-activity suggestions (those with `activity_breakdown`), creates one initiative per activity breakdown item.

**Request Body** (optional overrides):
```json
{
  "name": "Custom name override",
  "capex_gbp": 180000.0,
  "co2e_reduction_annual_tonnes": 340.0,
  "owner": "Energy Manager",
  "status": "idea",
  "add_to_scenario_ids": ["uuid"]
}
```

**Response 201** (single-activity):
```json
{
  "initiatives": [
    { "...full initiative object..." }
  ],
  "source_suggestion_id": "uuid",
  "added_to_scenarios": ["uuid"]
}
```

**Response 201** (multi-activity — one initiative per activity breakdown):
```json
{
  "initiatives": [
    { "...initiative for activity 1..." },
    { "...initiative for activity 2..." },
    { "...initiative for activity 3..." }
  ],
  "source_suggestion_id": "uuid",
  "added_to_scenarios": ["uuid"]
}
```

**Notes**:
- Creates AbatementInitiative(s) with `initiative_type: "ai_suggested"`
- Links back to the AISuggestion via `source_suggestion_id`
- For multi-activity suggestions: per-activity cost/saving/abatement from `activity_breakdown` is used for each initiative; user overrides in the request body apply to the first activity only (or are ignored for multi-activity)
- `add_to_scenario_ids`: optional array of scenario UUIDs to add the initiative(s) to. If omitted, initiatives are created in the global list only.
- Replaces the previous `add_to_scenario_id` (singular) field with `add_to_scenario_ids` (plural) to support adding to multiple scenarios at once.

---

## POST /api/v1/ai/suggestions/{suggestion_id}/dismiss

**Description**: Dismiss an AI suggestion (won't be suggested again in similar context).

**Request Body**:
```json
{
  "reason": "Already evaluated and rejected due to planning restrictions"
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "status": "dismissed",
  "dismiss_reason": "Already evaluated and rejected due to planning restrictions"
}
```

---

## GET /api/v1/ai/constraints

**Description**: Get current AI constraint configuration.

**Response 200**:
```json
{
  "id": "uuid",
  "organisation_id": "uuid",
  "excluded_technologies": ["nuclear", "carbon_capture"],
  "excluded_unit_ids": ["uuid-1"],
  "excluded_scopes": [],
  "max_initiative_cost_gbp": 500000.0,
  "min_confidence_level": "medium",
  "preferred_payback_years": 5,
  "industry_specific_filters": {
    "require_certified_offsets": false,
    "prefer_proven_technology": true
  },
  "updated_at": "2025-01-10T08:00:00Z"
}
```

**Response 404**: No constraints configured (defaults apply).

---

## PUT /api/v1/ai/constraints

**Description**: Create or update AI constraint configuration (upsert).

**Request Body**:
```json
{
  "excluded_technologies": ["nuclear", "carbon_capture"],
  "excluded_unit_ids": ["uuid-1"],
  "excluded_scopes": [],
  "max_initiative_cost_gbp": 500000.0,
  "min_confidence_level": "medium",
  "preferred_payback_years": 5,
  "industry_specific_filters": {
    "require_certified_offsets": false,
    "prefer_proven_technology": true
  }
}
```

**Validation**:
- `excluded_technologies`: array of strings
- `excluded_unit_ids`: array of valid CompanyUnit UUIDs
- `excluded_scopes`: array of integers (1, 2, 3)
- `min_confidence_level`: one of `"low"`, `"medium"`, `"high"`
- `preferred_payback_years`: positive integer

**Response 200**: Full constraints object.

---

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid request body |
| 401 | Missing or invalid JWT token |
| 404 | Suggestion or request not found |
| 409 | Suggestion already accepted/dismissed |
| 422 | Validation error or prerequisites not met |
| 429 | Rate limit exceeded (max 10 requests/minute) |
| 500 | Internal server error |
| 502 | OpenAI API error (upstream failure) |
| 504 | OpenAI API timeout (30s limit exceeded) |
