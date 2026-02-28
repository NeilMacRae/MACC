# Scenarios API Contract

**Base path**: `/api/v1/scenarios`
**Auth**: JWT Bearer token required on all endpoints

---

## POST /api/v1/scenarios

**Description**: Create a new scenario.

**Request Body**:
```json
{
  "name": "Aggressive 2030 Plan",
  "description": "Maximum reduction targeting net-zero by 2030",
  "is_baseline": false,
  "initiative_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Required fields**: `name`

**Constraints**:
- Only one scenario can have `is_baseline: true` at a time
- Setting a new baseline automatically unsets the previous one

**Response 201**:
```json
{
  "id": "uuid",
  "name": "Aggressive 2030 Plan",
  "description": "Maximum reduction targeting net-zero by 2030",
  "is_baseline": false,
  "total_capex_gbp": 250000.0,
  "total_opex_annual_gbp": -85000.0,
  "total_co2e_reduction_annual_tonnes": 5000.0,
  "residual_co2e_tonnes": 10000.0,
  "weighted_avg_cost_per_tonne": 50.0,
  "initiative_count": 3,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

---

## GET /api/v1/scenarios

**Description**: List all scenarios with summary metrics.

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Aggressive 2030 Plan",
      "description": "...",
      "is_baseline": false,
      "total_capex_gbp": 250000.0,
      "total_opex_annual_gbp": -85000.0,
      "total_co2e_reduction_annual_tonnes": 5000.0,
      "residual_co2e_tonnes": 10000.0,
      "initiative_count": 3,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 3
}
```

---

## GET /api/v1/scenarios/{scenario_id}

**Description**: Get full scenario detail including all initiatives.

**Response 200**:
```json
{
  "id": "uuid",
  "name": "Aggressive 2030 Plan",
  "description": "...",
  "is_baseline": false,
  "total_capex_gbp": 250000.0,
  "total_opex_annual_gbp": -85000.0,
  "total_co2e_reduction_annual_tonnes": 5000.0,
  "residual_co2e_tonnes": 10000.0,
  "weighted_avg_cost_per_tonne": 50.0,
  "initiatives": [
    {
      "id": "uuid-1",
      "name": "LED Lighting Upgrade",
      "capex_gbp": 45000.0,
      "opex_annual_gbp": -12000.0,
      "co2e_reduction_annual_tonnes": 150.0,
      "cost_per_tonne": 300.0,
      "status": "planned",
      "confidence": "high",
      "display_order": 1,
      "is_included": true
    }
  ],
  "target_alignment": {
    "has_targets": true,
    "targets": [
      {
        "id": "uuid",
        "target_year": 2030,
        "target_type": "absolute",
        "target_value_pct": 50.0,
        "baseline_co2e_tonnes": 15000.0,
        "target_co2e_tonnes": 7500.0,
        "projected_co2e_tonnes": 10000.0,
        "gap_co2e_tonnes": 2500.0,
        "on_track": false
      }
    ]
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-16T09:00:00Z"
}
```

---

## PUT /api/v1/scenarios/{scenario_id}

**Description**: Update scenario metadata.

**Request Body**:
```json
{
  "name": "Updated Plan Name",
  "description": "Updated description",
  "is_baseline": true
}
```

**Response 200**: Full scenario object.

---

## DELETE /api/v1/scenarios/{scenario_id}

**Description**: Delete a scenario. Does not delete contained initiatives.

**Response 204**: No content.

---

## POST /api/v1/scenarios/{scenario_id}/initiatives

**Description**: Add initiatives to a scenario.

**Request Body**:
```json
{
  "initiative_ids": ["uuid-4", "uuid-5"],
  "display_order_start": 4
}
```

**Response 200**: Full scenario object with updated initiatives.

---

## DELETE /api/v1/scenarios/{scenario_id}/initiatives/{initiative_id}

**Description**: Remove an initiative from a scenario.

**Response 204**: No content.

---

## PATCH /api/v1/scenarios/{scenario_id}/initiatives/reorder

**Description**: Reorder initiatives within a scenario (affects MACC chart display).

**Request Body**:
```json
{
  "initiative_order": [
    { "initiative_id": "uuid-1", "display_order": 1 },
    { "initiative_id": "uuid-2", "display_order": 2 },
    { "initiative_id": "uuid-3", "display_order": 3 }
  ]
}
```

**Response 200**: Full scenario object with updated order.

---

## GET /api/v1/scenarios/{scenario_id}/macc-data

**Description**: Get pre-computed MACC chart data for the scenario, sorted by cost-per-tonne ascending.

**Response 200**:
```json
{
  "scenario_id": "uuid",
  "scenario_name": "Aggressive 2030 Plan",
  "total_emissions_co2e_tonnes": 15000.0,
  "total_reduction_co2e_tonnes": 5000.0,
  "bars": [
    {
      "initiative_id": "uuid-1",
      "initiative_name": "LED Lighting Upgrade",
      "width": 150.0,
      "height": 300.0,
      "x_start": 0.0,
      "cost_per_tonne": 300.0,
      "co2e_reduction_annual_tonnes": 150.0,
      "capex_gbp": 45000.0,
      "opex_annual_gbp": -12000.0,
      "status": "planned",
      "confidence": "high",
      "is_negative_cost": false
    }
  ],
  "summary": {
    "total_capex_gbp": 250000.0,
    "total_opex_annual_gbp": -85000.0,
    "net_negative_cost_initiatives": 2,
    "net_positive_cost_initiatives": 5,
    "weighted_avg_cost_per_tonne": 50.0
  }
}
```

---

## GET /api/v1/scenarios/compare

**Description**: Compare two or more scenarios side-by-side.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scenario_ids | string | Yes | Comma-separated scenario UUIDs (2-5) |

**Response 200**:
```json
{
  "scenarios": [
    {
      "id": "uuid-1",
      "name": "Conservative Plan",
      "is_baseline": true,
      "total_capex_gbp": 100000.0,
      "total_opex_annual_gbp": -30000.0,
      "total_co2e_reduction_annual_tonnes": 2000.0,
      "residual_co2e_tonnes": 13000.0,
      "initiative_count": 5,
      "avg_cost_per_tonne": 50.0,
      "meets_targets": false,
      "gap_to_target_pct": 16.7
    },
    {
      "id": "uuid-2",
      "name": "Aggressive Plan",
      "is_baseline": false,
      "total_capex_gbp": 250000.0,
      "total_opex_annual_gbp": -85000.0,
      "total_co2e_reduction_annual_tonnes": 5000.0,
      "residual_co2e_tonnes": 10000.0,
      "initiative_count": 8,
      "avg_cost_per_tonne": 50.0,
      "meets_targets": false,
      "gap_to_target_pct": 33.3
    }
  ],
  "shared_initiatives": [
    { "id": "uuid", "name": "LED Lighting", "in_scenarios": ["uuid-1", "uuid-2"] }
  ],
  "unique_initiatives": {
    "uuid-1": [{ "id": "uuid", "name": "..." }],
    "uuid-2": [{ "id": "uuid", "name": "..." }]
  }
}
```

---

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid request (e.g., comparing < 2 scenarios) |
| 401 | Missing or invalid JWT token |
| 404 | Scenario not found |
| 409 | Conflict (e.g., duplicate initiative in scenario) |
| 422 | Validation error |
| 500 | Internal server error |
