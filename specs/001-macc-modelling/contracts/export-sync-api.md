# Export & Sync API Contract

**Base path**: `/api/v1`
**Auth**: JWT Bearer token required on all endpoints

---

## Export Endpoints

### POST /api/v1/export/report

**Description**: Generate a PDF or Excel report for a scenario.

**Request Body**:
```json
{
  "scenario_id": "uuid",
  "format": "pdf",
  "include_sections": ["executive_summary", "macc_chart", "initiatives_table", "target_alignment", "assumptions"],
  "branding": {
    "company_name": "Acme Corp",
    "include_logo": true
  }
}
```

**Validation**:
- `format`: one of `"pdf"`, `"xlsx"`
- `include_sections`: array of valid section names
- At least one section required

**Response 200** (Content-Type: application/octet-stream):
Binary file download with headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="MACC_Report_Aggressive_Plan_2025-01-15.pdf"
```

**PDF sections**:
- **Executive Summary**: Org context, total emissions, scenario reduction, target alignment
- **MACC Chart**: SVG render of the marginal abatement cost curve
- **Initiatives Table**: All initiatives sorted by cost-per-tonne with status, owner, confidence
- **Target Alignment**: Progress toward each defined target
- **Assumptions**: Data quality notes, confidence levels, AI suggestion disclaimers

**Excel sections**:
- **Summary** sheet: Key metrics
- **Initiatives** sheet: Full initiative data (filterable)
- **Emissions** sheet: Source-level emissions data
- **MACC Data** sheet: Raw MACC chart data points

---

### POST /api/v1/export/initiatives

**Description**: Export initiatives as CSV.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scenario_id | string | No | Filter to scenario (default: all) |
| status | string | No | Filter by status |
| format | string | No | "csv" (default) |

**Response 200** (Content-Type: text/csv):
```csv
id,name,type,status,capex_gbp,opex_annual_gbp,co2e_reduction_annual_tonnes,cost_per_tonne,payback_years,lifespan_years,owner,confidence,scopes,created_at
uuid-1,LED Lighting,custom,planned,45000,-12000,150,-500,3.75,10,Facilities Manager,high,"2",2025-01-15
```

---

### POST /api/v1/export/macc-chart

**Description**: Export the MACC chart as SVG or PNG image.

**Request Body**:
```json
{
  "scenario_id": "uuid",
  "format": "svg",
  "width": 1200,
  "height": 600,
  "include_legend": true,
  "color_scheme": "status"
}
```

**Validation**:
- `format`: one of `"svg"`, `"png"`
- `width`: 400–3000 pixels
- `height`: 300–2000 pixels
- `color_scheme`: one of `"status"`, `"confidence"`, `"scope"`

**Response 200**: SVG or PNG binary.

---

## Data Sync Endpoints

### POST /api/v1/sync/emissions

**Description**: Trigger a sync of emissions data from the EcoOnline main application.

**Response 202**:
```json
{
  "sync_id": "uuid",
  "status": "in_progress",
  "started_at": "2025-01-15T10:30:00Z",
  "estimated_duration_seconds": 30
}
```

---

### GET /api/v1/sync/status

**Description**: Get the latest sync status.

**Response 200**:
```json
{
  "last_sync": {
    "sync_id": "uuid",
    "status": "completed",
    "started_at": "2025-01-15T10:30:00Z",
    "completed_at": "2025-01-15T10:30:25Z",
    "records_synced": 156,
    "records_created": 12,
    "records_updated": 144,
    "records_failed": 0,
    "errors": []
  },
  "next_scheduled_sync": null,
  "sync_enabled": true
}
```

---

### GET /api/v1/sync/history

**Description**: Get sync history log.

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
      "sync_id": "uuid",
      "status": "completed",
      "started_at": "2025-01-15T10:30:00Z",
      "completed_at": "2025-01-15T10:30:25Z",
      "records_synced": 156,
      "records_failed": 0,
      "trigger": "manual"
    }
  ],
  "total": 15,
  "page": 1,
  "page_size": 20
}
```

---

## Health & Meta Endpoints

### GET /api/v1/health

**Description**: Health check endpoint (no auth required).

**Response 200**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "ecoonline_api": "connected",
  "openai_api": "connected",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

### GET /api/v1/meta

**Description**: Get application metadata.

**Response 200**:
```json
{
  "app_name": "MACC Modelling Service",
  "version": "1.0.0",
  "api_version": "v1",
  "supported_export_formats": ["pdf", "xlsx", "csv", "svg", "png"],
  "max_initiatives_per_scenario": 100,
  "max_scenarios": 20,
  "ai_model": "gpt-4o-2024-08-06",
  "ai_rate_limit": "10 requests/minute"
}
```

---

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid request body or parameters |
| 401 | Missing or invalid JWT token |
| 404 | Resource not found |
| 409 | Sync already in progress |
| 422 | Validation error |
| 500 | Internal server error |
| 502 | Upstream API error (EcoOnline or OpenAI) |
| 503 | Service temporarily unavailable |
