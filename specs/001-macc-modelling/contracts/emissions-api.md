# Emissions API Contract

**Base path**: `/api/v1/emissions`
**Auth**: JWT Bearer token required on all endpoints

---

## GET /api/v1/emissions/overview

**Description**: Get organisation-level emissions summary across all scopes.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | integer | No | Filter by year (default: latest) |
| market_factor_type | string | No | "Location" or "Market" (default: "Location") |

**Response 200**:
```json
{
  "organisation_id": "uuid",
  "organisation_name": "string",
  "year": 2025,
  "market_factor_type": "Location",
  "total_co2e_tonnes": 15000.0,
  "by_scope": {
    "scope_1": { "co2e_tonnes": 3000.0, "percentage": 20.0 },
    "scope_2": { "co2e_tonnes": 5000.0, "percentage": 33.3 },
    "scope_3": { "co2e_tonnes": 7000.0, "percentage": 46.7 }
  },
  "by_question_group": [
    {
      "question_group": "Premises",
      "co2e_tonnes": 8000.0,
      "percentage": 53.3
    }
  ],
  "top_sources": [
    {
      "source_id": "uuid",
      "activity": "Electricity consumption, eGrid: ERCOT All",
      "question": "Electricity",
      "question_group": "Premises",
      "scope": 2,
      "co2e_tonnes": 4500.0,
      "percentage": 30.0
    }
  ],
  "available_years": [2023, 2024, 2025]
}
```

---

## GET /api/v1/emissions/hierarchy

**Description**: Get organisational hierarchy tree with aggregated emissions. Returns the self-referential `CompanyUnit` tree (mirrors `company_construct` from EcoOnline analytics DB).

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reporting_year | integer | No | Filter by year (default: latest) |
| market_factor_type | string | No | "Location" or "Market" (default: "Location") |
| parent_id | string | No | Root node UUID (default: org root, for subtree queries) |
| depth | integer | No | Max tree depth to return (default: all) |
| include_closed | boolean | No | Include units with close_date in past (default: false) |

**Response 200**:
```json
{
  "root": {
    "id": "uuid",
    "company_unit_id": 5078,
    "company_unit_name": "Macmillan",
    "company_unit_type": "division",
    "total_co2e_tonnes": 15000.0,
    "children": [
      {
        "id": "uuid",
        "company_unit_id": 18827,
        "company_unit_name": "Global Trade",
        "company_unit_type": "division",
        "total_co2e_tonnes": 10000.0,
        "country": null,
        "children": [
          {
            "id": "uuid",
            "company_unit_id": 18833,
            "company_unit_name": "United States",
            "company_unit_type": "division",
            "total_co2e_tonnes": 4000.0,
            "country": "United States",
            "country_code": null,
            "children": [
              {
                "id": "uuid",
                "company_unit_id": 36689,
                "company_unit_name": "New Delhi",
                "company_unit_type": "site",
                "facility_type": "Office",
                "total_co2e_tonnes": 500.0,
                "children": []
              }
            ]
          }
        ]
      }
    ]
  },
  "reporting_year": 2025
}
```

---

## GET /api/v1/emissions/units/{unit_id}

**Description**: Get emissions detail for any company unit (division or site). For divisions, aggregates across all descendant units. For sites, includes individual emission sources.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | integer | No | Filter by year |
| market_factor_type | string | No | "Location" or "Market" (default: "Location") |

**Response 200** (division):
```json
{
  "id": "uuid",
  "company_unit_id": 18833,
  "company_unit_name": "United States",
  "company_unit_type": "division",
  "market_factor_type": "Location",
  "total_co2e_tonnes": 4000.0,
  "by_scope": {
    "scope_1": { "co2e_tonnes": 800.0, "percentage": 20.0 },
    "scope_2": { "co2e_tonnes": 1600.0, "percentage": 40.0 },
    "scope_3": { "co2e_tonnes": 1600.0, "percentage": 40.0 }
  },
  "by_question_group": [
    { "question_group": "Premises", "co2e_tonnes": 3000.0 }
  ],
  "top_sources": [],
  "child_units": [
    {
      "id": "uuid",
      "company_unit_name": "Trade (US)",
      "company_unit_type": "division",
      "total_co2e_tonnes": 2000.0
    }
  ]
}
```

**Response 200** (site):
```json
{
  "id": "uuid",
  "company_unit_id": 36689,
  "company_unit_name": "New Delhi",
  "company_unit_type": "site",
  "facility_type": "Office",
  "city": "New Delhi",
  "country": "India",
  "country_code": "IN",
  "market_factor_type": "Location",
  "total_co2e_tonnes": 500.0,
  "by_scope": {},
  "sources": [
    {
      "id": "uuid",
      "answer_id": 1005757,
      "activity": "Electricity consumption, eGrid: ERCOT All",
      "question": "Electricity",
      "question_group": "Premises",
      "answer_unit": "kWh",
      "co2e_tonnes": 400.0,
      "scopes": [2, 3],
      "records": [
        {
          "id": "uuid",
          "year": 2025,
          "month": 1,
          "scope": 2,
          "market_factor_type": "Location",
          "value": 41004.69,
          "co2e_kg": 41.0,
          "quality": "Estimated",
          "upstream": "Regular",
          "upstream_name": null
        }
      ]
    }
  ]
}
```

---

## GET /api/v1/emissions/trends

**Description**: Get emissions trends over time for any company unit. Aggregates across all descendants.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| unit_id | string | No | CompanyUnit UUID (default: org root = all) |
| scope | integer | No | Filter to specific scope (1, 2, 3) |
| market_factor_type | string | No | "Location" or "Market" (default: "Location") |

**Response 200**:
```json
{
  "unit_id": "uuid",
  "company_unit_name": "Global Trade",
  "market_factor_type": "Location",
  "trends": [
    { "year": 2023, "co2e_tonnes": 14000.0 },
    { "year": 2024, "co2e_tonnes": 14500.0 },
    { "year": 2025, "co2e_tonnes": 15000.0 }
  ]
}
```

---

## GET /api/v1/emissions/sources

**Description**: List all emission sources (for initiative target selection).

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | integer | No | Filter by year |
| scope | integer | No | Filter by scope |
| question_group | string | No | Filter by question group |
| market_factor_type | string | No | "Location" or "Market" (default: "Location") |

**Response 200**:
```json
{
  "sources": [
    {
      "id": "uuid",
      "answer_id": 1005757,
      "activity": "Electricity consumption, eGrid: ERCOT All",
      "question": "Electricity",
      "question_group": "Premises",
      "answer_unit": "kWh",
      "company_unit_id": "uuid",
      "company_unit_name": "string",
      "company_unit_type": "site",
      "co2e_tonnes": 2000.0,
      "scopes": [2, 3]
    }
  ]
}
```

---

## Cascade Endpoints (Guided Source Selection)

These endpoints support the guided cascade for initiative source selection: scope → question_group → question → activity → company units. Each step returns only values that exist in the loaded emissions data, filtered by the selections from previous steps.

### GET /api/v1/emissions/cascade/scopes

**Description**: Get distinct emission scopes present in the organisation's data.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | integer | No | Filter by year (default: latest) |
| market_factor_type | string | No | "Location" or "Market" (default: "Location") |

**Response 200**:
```json
{
  "scopes": [
    { "scope": 1, "co2e_tonnes": 3000.0, "source_count": 8 },
    { "scope": 2, "co2e_tonnes": 5000.0, "source_count": 15 },
    { "scope": 3, "co2e_tonnes": 7000.0, "source_count": 20 }
  ]
}
```

---

### GET /api/v1/emissions/cascade/question-groups

**Description**: Get distinct question groups for a given scope.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scope | integer | Yes | GHG scope (1, 2, or 3) |
| year | integer | No | Filter by year (default: latest) |
| market_factor_type | string | No | "Location" or "Market" (default: "Location") |

**Response 200**:
```json
{
  "question_groups": [
    { "question_group": "Premises", "co2e_tonnes": 4500.0, "source_count": 10 },
    { "question_group": "Transport", "co2e_tonnes": 500.0, "source_count": 5 }
  ]
}
```

---

### GET /api/v1/emissions/cascade/questions

**Description**: Get distinct questions for a given scope and question group.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scope | integer | Yes | GHG scope (1, 2, or 3) |
| question_group | string | Yes | Question group name |
| year | integer | No | Filter by year (default: latest) |
| market_factor_type | string | No | "Location" or "Market" (default: "Location") |

**Response 200**:
```json
{
  "questions": [
    { "question": "Electricity", "co2e_tonnes": 4000.0, "source_count": 8 },
    { "question": "Natural Gas", "co2e_tonnes": 500.0, "source_count": 2 }
  ]
}
```

---

### GET /api/v1/emissions/cascade/activities

**Description**: Get distinct activities for a given scope, question group, and question.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scope | integer | Yes | GHG scope (1, 2, or 3) |
| question_group | string | Yes | Question group name |
| question | string | Yes | Question name |
| year | integer | No | Filter by year (default: latest) |
| market_factor_type | string | No | "Location" or "Market" (default: "Location") |

**Response 200**:
```json
{
  "activities": [
    { "activity": "Electricity consumption, eGrid: ERCOT All", "co2e_tonnes": 2500.0, "source_count": 5 },
    { "activity": "Electricity consumption, eGrid: WECC NW", "co2e_tonnes": 1500.0, "source_count": 3 }
  ]
}
```

---

### GET /api/v1/emissions/cascade/company-units

**Description**: Get company units that have emission sources matching the selected activity, with per-unit CO₂e totals for contextual display on the initiative form.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| activity | string | Yes | Activity name |
| scope | integer | Yes | GHG scope (1, 2, or 3) |
| question_group | string | Yes | Question group name |
| question | string | Yes | Question name |
| year | integer | No | Filter by year (default: latest) |
| market_factor_type | string | No | "Location" or "Market" (default: "Location") |

**Response 200**:
```json
{
  "company_units": [
    {
      "id": "uuid-1",
      "company_unit_name": "HQ Building",
      "company_unit_type": "site",
      "co2e_tonnes": 400.0,
      "emission_source_id": "uuid-src-1"
    },
    {
      "id": "uuid-2",
      "company_unit_name": "Manufacturing Plant A",
      "company_unit_type": "site",
      "co2e_tonnes": 600.0,
      "emission_source_id": "uuid-src-2"
    }
  ],
  "total_co2e_tonnes": 1000.0
}
```

**Notes**:
- `co2e_tonnes` per unit shows the annual emissions for that specific activity at that site — used for contextual display and over-reduction warning calculation
- `emission_source_id` is the resolved source ID linking the activity to the company unit — the frontend passes these to the initiative creation endpoint
- `total_co2e_tonnes` is the sum across all returned units, used for the over-reduction warning threshold

---

## Error Responses

All endpoints return standard error format:
```json
{
  "detail": "Human-readable error message"
}
```

| Status | Description |
|--------|-------------|
| 401 | Missing or invalid JWT token |
| 404 | Resource not found |
| 422 | Validation error |
| 500 | Internal server error |
