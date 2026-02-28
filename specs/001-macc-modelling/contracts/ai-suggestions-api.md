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
- `priority`: one of `"cost_effective"`, `"high_impact"`, `"quick_wins"`
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
      "target_scopes": [2],
      "target_source_ids": ["uuid-1"],
      "implementation_complexity": "medium",
      "typical_timeline_months": 6,
      "relevance_score": 0.92,
      "assumptions": [
        "Irish grid emission factor of 0.296 kgCO2/kWh",
        "500kW system producing ~450MWh/year",
        "25-year system lifespan"
      ]
    }
  ],
  "context_used": {
    "industry_sector": "Manufacturing",
    "total_emissions_co2e": 15000.0,
    "source_count": 12,
    "constraint_config_applied": true
  },
  "created_at": "2025-01-15T10:30:00Z"
}
```

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

**Description**: Accept an AI suggestion and convert it into an initiative.

**Request Body** (optional overrides):
```json
{
  "name": "Custom name override",
  "capex_gbp": 180000.0,
  "co2e_reduction_annual_tonnes": 340.0,
  "owner": "Energy Manager",
  "status": "idea",
  "add_to_scenario_id": "uuid"
}
```

**Response 201**: Full initiative object (same as Initiatives API GET response).

**Notes**:
- Creates a new AbatementInitiative with `initiative_type: "ai_suggested"`
- Links back to the AISuggestion via `source_suggestion_id`
- Optionally adds to specified scenario

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
