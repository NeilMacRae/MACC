# Context & Targets API Contract

**Base path**: `/api/v1/context`
**Auth**: JWT Bearer token required on all endpoints

---

## GET /api/v1/context

**Description**: Get the organisational context profile.

**Response 200**:
```json
{
  "id": "uuid",
  "organisation_id": "uuid",
  "industry_sector": "Manufacturing",
  "employee_count": 2500,
  "annual_revenue_gbp": 150000000.0,
  "operating_geographies": ["Ireland", "United Kingdom", "Germany"],
  "sustainability_maturity": "intermediate",
  "budget_constraint_gbp": 500000.0,
  "target_year": 2030,
  "notes": "Focus on Scope 1 and 2 first",
  "created_at": "2025-01-10T08:00:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

**Response 404**: No context configured yet.

---

## PUT /api/v1/context

**Description**: Create or update the organisational context (upsert).

**Request Body**:
```json
{
  "industry_sector": "Manufacturing",
  "employee_count": 2500,
  "annual_revenue_gbp": 150000000.0,
  "operating_geographies": ["Ireland", "United Kingdom", "Germany"],
  "sustainability_maturity": "intermediate",
  "budget_constraint_gbp": 500000.0,
  "target_year": 2030,
  "notes": "Focus on Scope 1 and 2 first"
}
```

**Validation**:
- `sustainability_maturity`: one of `"beginner"`, `"intermediate"`, `"advanced"`
- `employee_count`: positive integer
- `annual_revenue_gbp`: positive float
- `budget_constraint_gbp`: positive float
- `operating_geographies`: array of strings, max 50

**Response 200**: Full context object.

---

## GET /api/v1/context/targets

**Description**: List all emission reduction targets.

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "target_year": 2030,
      "target_type": "absolute",
      "target_value_pct": 50.0,
      "baseline_year": 2020,
      "baseline_co2e_tonnes": 20000.0,
      "target_co2e_tonnes": 10000.0,
      "scope_coverage": [1, 2],
      "source": "SBTi",
      "notes": "Science-based target approved 2023",
      "created_at": "2025-01-10T08:00:00Z"
    }
  ],
  "total": 2
}
```

---

## POST /api/v1/context/targets

**Description**: Create a new emission reduction target.

**Request Body**:
```json
{
  "target_year": 2030,
  "target_type": "absolute",
  "target_value_pct": 50.0,
  "baseline_year": 2020,
  "baseline_co2e_tonnes": 20000.0,
  "scope_coverage": [1, 2],
  "source": "SBTi",
  "notes": "Science-based target approved 2023"
}
```

**Required fields**: `target_year`, `target_type`, `target_value_pct`, `baseline_year`, `baseline_co2e_tonnes`

**Validation**:
- `target_type`: one of `"absolute"`, `"intensity"`
- `target_value_pct`: 0.1 – 100.0
- `target_year` > `baseline_year`
- `scope_coverage`: array of integers (1, 2, 3)

**Computed field**: `target_co2e_tonnes` = `baseline_co2e_tonnes` × (1 - `target_value_pct` / 100)

**Response 201**: Full target object.

---

## PUT /api/v1/context/targets/{target_id}

**Description**: Update an emission reduction target.

**Request Body**: Same as POST (all fields optional).

**Response 200**: Full target object.

---

## DELETE /api/v1/context/targets/{target_id}

**Description**: Delete an emission reduction target.

**Response 204**: No content.

---

## GET /api/v1/context/targets/{target_id}/progress

**Description**: Get progress toward a specific target considering a scenario.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scenario_id | string | No | Scenario to evaluate against (default: baseline) |

**Response 200**:
```json
{
  "target": {
    "id": "uuid",
    "target_year": 2030,
    "target_type": "absolute",
    "target_value_pct": 50.0,
    "target_co2e_tonnes": 10000.0
  },
  "current_co2e_tonnes": 15000.0,
  "scenario_reduction_co2e_tonnes": 5000.0,
  "projected_co2e_tonnes": 10000.0,
  "gap_co2e_tonnes": 0.0,
  "on_track": true,
  "coverage_pct": 100.0,
  "years_remaining": 5
}
```

---

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid request body |
| 401 | Missing or invalid JWT token |
| 404 | Context or target not found |
| 422 | Validation error |
| 500 | Internal server error |
