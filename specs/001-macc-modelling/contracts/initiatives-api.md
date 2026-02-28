# Initiatives API Contract

**Base path**: `/api/v1/initiatives`
**Auth**: JWT Bearer token required on all endpoints

---

## POST /api/v1/initiatives

**Description**: Create a new abatement initiative.

**Request Body**:
```json
{
  "name": "LED Lighting Upgrade",
  "description": "Replace all fluorescent lighting with LED across HQ",
  "initiative_type": "custom",
  "status": "idea",
  "capex_gbp": 45000.0,
  "opex_annual_gbp": -12000.0,
  "co2e_reduction_annual_tonnes": 150.0,
  "lifespan_years": 10,
  "owner": "Facilities Manager",
  "confidence": "high",
  "notes": "Includes installation and disposal costs",
  "emission_source_ids": ["uuid-1", "uuid-2"]
}
```

**Required fields**: `name`, `co2e_reduction_annual_tonnes`, `capex_gbp`, `emission_source_ids` (≥1)

**Source selection**: The `emission_source_ids` are resolved by the frontend using the guided cascade endpoints (`GET /emissions/cascade/*`). The cascade company-units endpoint returns an `emission_source_id` per unit — the frontend collects these IDs from the user's selected company units and passes them here. This means one activity maps to one or more emission sources (one per selected company unit).

**Response 201**:
```json
{
  "id": "uuid",
  "name": "LED Lighting Upgrade",
  "description": "...",
  "initiative_type": "custom",
  "status": "idea",
  "capex_gbp": 45000.0,
  "opex_annual_gbp": -12000.0,
  "co2e_reduction_annual_tonnes": 150.0,
  "cost_per_tonne": -500.0,
  "payback_years": 3.75,
  "lifespan_years": 10,
  "owner": "Facilities Manager",
  "confidence": "high",
  "notes": "...",
  "warnings": [],
  "emission_sources": [
    { "id": "uuid-1", "activity": "HQ Lighting", "question": "Electricity", "question_group": "Premises", "co2e_tonnes": 200.0 }
  ],
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

**Warnings**: When the initiative's `co2e_reduction_annual_tonnes` exceeds the total emissions for its linked sources, the response includes a non-blocking warning:
```json
{
  "warnings": [
    {
      "type": "over_reduction",
      "message": "Annual reduction of 250 tCO₂e exceeds source total of 200 tCO₂e. Source data may be incomplete.",
      "source_co2e_tonnes": 200.0,
      "reduction_co2e_tonnes": 250.0
    }
  ]
}
```
```

---

## GET /api/v1/initiatives

**Description**: List all initiatives with optional filtering.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status (comma-separated) |
| initiative_type | string | No | "custom" or "ai_suggested" |
| scope | integer | No | Filter by target emission scope |
| sort_by | string | No | "cost_per_tonne", "co2e_reduction", "cost", "name" |
| sort_order | string | No | "asc" (default) or "desc" |
| page | integer | No | Page number (default: 1) |
| page_size | integer | No | Items per page (default: 50, max: 100) |

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "LED Lighting Upgrade",
      "initiative_type": "custom",
      "status": "planned",
      "capex_gbp": 45000.0,
      "opex_annual_gbp": -12000.0,
      "co2e_reduction_annual_tonnes": 150.0,
      "cost_per_tonne": -500.0,
      "owner": "Facilities Manager",
      "confidence": "high",
      "emission_source_count": 2,
      "scenario_count": 1,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

---

## GET /api/v1/initiatives/{initiative_id}

**Description**: Get full initiative detail.

**Response 200**:
```json
{
  "id": "uuid",
  "name": "LED Lighting Upgrade",
  "description": "...",
  "initiative_type": "custom",
  "status": "planned",
  "capex_gbp": 45000.0,
  "opex_annual_gbp": -12000.0,
  "co2e_reduction_annual_tonnes": 150.0,
  "cost_per_tonne": -500.0,
  "payback_years": 3.75,
  "lifespan_years": 10,
  "owner": "Facilities Manager",
  "confidence": "high",
  "notes": "...",
  "source_suggestion_id": null,
  "emission_sources": [
    {
      "id": "uuid-1",
      "activity": "Electricity consumption, eGrid: ERCOT All",
      "question": "Electricity",
      "question_group": "Premises",
      "answer_unit": "kWh",
      "co2e_tonnes": 200.0,
      "company_unit_name": "HQ Building",
      "company_unit_type": "site"
    }
  ],
  "scenarios": [
    { "id": "uuid", "name": "Baseline Plan", "is_baseline": true }
  ],
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-16T09:00:00Z"
}
```

---

## PUT /api/v1/initiatives/{initiative_id}

**Description**: Update an existing initiative.

**Request Body**: Same as POST (all fields optional except at least one must change).

**Response 200**: Full initiative object (same as GET).

**Status transition rules**:
- `idea` → `planned`, `rejected`
- `planned` → `approved`, `rejected`
- `approved` → `in_progress`, `rejected`
- `in_progress` → `completed`, `rejected`
- `completed` → (terminal)
- `rejected` → (terminal)

**Response 422** (invalid transition):
```json
{
  "detail": "Invalid status transition from 'completed' to 'idea'"
}
```

---

## PATCH /api/v1/initiatives/{initiative_id}/status

**Description**: Update initiative status only.

**Request Body**:
```json
{
  "status": "approved",
  "notes": "Approved in Q2 budget review"
}
```

**Response 200**: Full initiative object.

---

## DELETE /api/v1/initiatives/{initiative_id}

**Description**: Delete an initiative. Removes from all scenarios.

**Response 204**: No content.

**Response 409**:
```json
{
  "detail": "Cannot delete initiative with status 'in_progress'. Set status to 'rejected' first."
}
```

---

## GET /api/v1/initiatives/{initiative_id}/overlap

**Description**: Check if initiative reduction targets overlap with other initiatives.

**Response 200**:
```json
{
  "initiative_id": "uuid",
  "overlapping_initiatives": [
    {
      "id": "uuid",
      "name": "Other Initiative",
      "shared_sources": [
        { "id": "uuid", "activity": "Electricity consumption", "question_group": "Premises", "co2e_tonnes": 200.0 }
      ],
      "combined_reduction_pct": 115.0,
      "warning": "Combined reductions exceed 100% of source emissions"
    }
  ],
  "total_overlap_co2e_tonnes": 30.0
}
```

---

## POST /api/v1/initiatives/bulk-validate

**Description**: Validate a set of initiatives for feasibility (reduction ≤ source emissions).

**Request Body**:
```json
{
  "initiative_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response 200**:
```json
{
  "valid": false,
  "issues": [
    {
      "initiative_id": "uuid-1",
      "issue_type": "over_reduction",
      "message": "Reduction of 250t exceeds source total of 200t",
      "source_id": "uuid",
      "source_name": "HQ Lighting"
    }
  ]
}
```

---

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid request body |
| 401 | Missing or invalid JWT token |
| 404 | Initiative not found |
| 409 | Conflict (e.g., delete active initiative) |
| 422 | Validation error (e.g., invalid status transition, missing required fields) |
| 500 | Internal server error |

**Note**: Reduction exceeding source emissions is a **non-blocking warning** returned in the response body `warnings` array, not a 422 error. See POST endpoint documentation above.
