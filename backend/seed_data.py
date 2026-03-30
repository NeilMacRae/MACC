"""Seed database with realistic sample data.

Fictional company: Verdant Heavy Industries Ltd
- Heavy industrial manufacturing (steel, fabricated metals, industrial machinery)
- Physical operations: GB, NO, SE, FI, DK, US, CA
- Sales offices: global (DE, FR, JP, AU, SG, BR)
- Home currency: GBP
- Scope mix target: ~70% S3 / ~20% S2 / ~10% S1
- 36 months of emissions records (Jan 2023 – Dec 2025)

Run with:  python seed_data.py  (from backend/ with venv active)
Or via:    make seed
"""

from __future__ import annotations

import asyncio
import random
import sys
from datetime import date
from pathlib import Path

# Ensure src/ is importable when run from backend/
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.context import EmissionTarget, OrganisationalContext
from src.models.database import AsyncSessionLocal, engine
from src.models.emissions import EmissionRecord, EmissionSource
from src.models.organisation import CompanyUnit, Organisation
from src.models.sync import SyncLog

# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------
random.seed(42)

# ---------------------------------------------------------------------------
# Org hierarchy definition
# ---------------------------------------------------------------------------
# company_unit_id: integer (EcoOnline-style IDs starting at 1000)
# Each entry: (cu_id, name, type, parent_id, facility_type, city, country_code, continent, lat, lng, level_1, level_2, level_3)

ORG_UNITS: list[dict[str, object]] = [
    # ── Level 1: Business Divisions ──────────────────────────────────────────
    {
        "cu_id": 1000, "name": "Verdant Heavy Industries Ltd", "type": "division",
        "parent": None, "facility_type": None, "city": "London",
        "country": "United Kingdom", "cc": "GB", "continent": "Europe",
        "lat": 51.5074, "lng": -0.1278, "l1": "Verdant Heavy Industries Ltd", "l2": None, "l3": None,
    },
    {
        "cu_id": 1001, "name": "European Manufacturing", "type": "division",
        "parent": 1000, "facility_type": None, "city": None,
        "country": None, "cc": None, "continent": "Europe",
        "lat": None, "lng": None, "l1": "Verdant Heavy Industries Ltd", "l2": "European Manufacturing", "l3": None,
    },
    {
        "cu_id": 1002, "name": "North American Operations", "type": "division",
        "parent": 1000, "facility_type": None, "city": None,
        "country": None, "cc": None, "continent": "North America",
        "lat": None, "lng": None, "l1": "Verdant Heavy Industries Ltd", "l2": "North American Operations", "l3": None,
    },
    {
        "cu_id": 1003, "name": "Global Sales & Distribution", "type": "division",
        "parent": 1000, "facility_type": None, "city": None,
        "country": None, "cc": None, "continent": None,
        "lat": None, "lng": None, "l1": "Verdant Heavy Industries Ltd", "l2": "Global Sales & Distribution", "l3": None,
    },
    # ── Level 2: Regional Business Units (under European Manufacturing) ───────
    {
        "cu_id": 1010, "name": "UK Steel Division", "type": "division",
        "parent": 1001, "facility_type": None, "city": "Sheffield",
        "country": "United Kingdom", "cc": "GB", "continent": "Europe",
        "lat": 53.3811, "lng": -1.4701, "l1": "Verdant Heavy Industries Ltd", "l2": "European Manufacturing", "l3": "UK Steel Division",
    },
    {
        "cu_id": 1011, "name": "Nordic Industrial Group", "type": "division",
        "parent": 1001, "facility_type": None, "city": "Oslo",
        "country": "Norway", "cc": "NO", "continent": "Europe",
        "lat": 59.9139, "lng": 10.7522, "l1": "Verdant Heavy Industries Ltd", "l2": "European Manufacturing", "l3": "Nordic Industrial Group",
    },
    # ── Level 3: Manufacturing Sites ─────────────────────────────────────────
    # UK sites
    {
        "cu_id": 1020, "name": "Sheffield Steel Plant", "type": "site",
        "parent": 1010, "facility_type": "Mill", "city": "Sheffield",
        "country": "United Kingdom", "cc": "GB", "continent": "Europe",
        "lat": 53.3811, "lng": -1.4701, "l1": "Verdant Heavy Industries Ltd", "l2": "European Manufacturing", "l3": "Sheffield Steel Plant",
    },
    {
        "cu_id": 1021, "name": "Rotherham Fabrication Facility", "type": "site",
        "parent": 1010, "facility_type": "Factory", "city": "Rotherham",
        "country": "United Kingdom", "cc": "GB", "continent": "Europe",
        "lat": 53.4300, "lng": -1.3560, "l1": "Verdant Heavy Industries Ltd", "l2": "European Manufacturing", "l3": "Rotherham Fabrication Facility",
    },
    # Nordic sites
    {
        "cu_id": 1030, "name": "Oslo Manufacturing Plant", "type": "site",
        "parent": 1011, "facility_type": "Factory", "city": "Oslo",
        "country": "Norway", "cc": "NO", "continent": "Europe",
        "lat": 59.9139, "lng": 10.7522, "l1": "Verdant Heavy Industries Ltd", "l2": "European Manufacturing", "l3": "Oslo Manufacturing Plant",
    },
    {
        "cu_id": 1031, "name": "Gothenburg Machinery Works", "type": "site",
        "parent": 1011, "facility_type": "Factory", "city": "Gothenburg",
        "country": "Sweden", "cc": "SE", "continent": "Europe",
        "lat": 57.7089, "lng": 11.9746, "l1": "Verdant Heavy Industries Ltd", "l2": "European Manufacturing", "l3": "Gothenburg Machinery Works",
    },
    {
        "cu_id": 1032, "name": "Helsinki Components Plant", "type": "site",
        "parent": 1011, "facility_type": "Factory", "city": "Helsinki",
        "country": "Finland", "cc": "FI", "continent": "Europe",
        "lat": 60.1699, "lng": 24.9384, "l1": "Verdant Heavy Industries Ltd", "l2": "European Manufacturing", "l3": "Helsinki Components Plant",
    },
    {
        "cu_id": 1033, "name": "Copenhagen Distribution Centre", "type": "site",
        "parent": 1011, "facility_type": "Warehouse", "city": "Copenhagen",
        "country": "Denmark", "cc": "DK", "continent": "Europe",
        "lat": 55.6761, "lng": 12.5683, "l1": "Verdant Heavy Industries Ltd", "l2": "European Manufacturing", "l3": "Copenhagen Distribution Centre",
    },
    # North American sites
    {
        "cu_id": 1040, "name": "Detroit Assembly Plant", "type": "site",
        "parent": 1002, "facility_type": "Factory", "city": "Detroit",
        "country": "United States", "cc": "US", "continent": "North America",
        "lat": 42.3314, "lng": -83.0458, "l1": "Verdant Heavy Industries Ltd", "l2": "North American Operations", "l3": "Detroit Assembly Plant",
    },
    {
        "cu_id": 1041, "name": "Houston Processing Facility", "type": "site",
        "parent": 1002, "facility_type": "Factory", "city": "Houston",
        "country": "United States", "cc": "US", "continent": "North America",
        "lat": 29.7604, "lng": -95.3698, "l1": "Verdant Heavy Industries Ltd", "l2": "North American Operations", "l3": "Houston Processing Facility",
    },
    {
        "cu_id": 1042, "name": "Toronto Manufacturing Hub", "type": "site",
        "parent": 1002, "facility_type": "Factory", "city": "Toronto",
        "country": "Canada", "cc": "CA", "continent": "North America",
        "lat": 43.6532, "lng": -79.3832, "l1": "Verdant Heavy Industries Ltd", "l2": "North American Operations", "l3": "Toronto Manufacturing Hub",
    },
    # Sales offices (shallow — directly under Global Sales & Distribution)
    {
        "cu_id": 1050, "name": "London HQ & Sales", "type": "site",
        "parent": 1003, "facility_type": "Office", "city": "London",
        "country": "United Kingdom", "cc": "GB", "continent": "Europe",
        "lat": 51.5074, "lng": -0.1278, "l1": "Verdant Heavy Industries Ltd", "l2": "Global Sales & Distribution", "l3": None,
    },
    {
        "cu_id": 1051, "name": "Frankfurt Sales Office", "type": "site",
        "parent": 1003, "facility_type": "Office", "city": "Frankfurt",
        "country": "Germany", "cc": "DE", "continent": "Europe",
        "lat": 50.1109, "lng": 8.6821, "l1": "Verdant Heavy Industries Ltd", "l2": "Global Sales & Distribution", "l3": None,
    },
    {
        "cu_id": 1052, "name": "Singapore APAC Office", "type": "site",
        "parent": 1003, "facility_type": "Office", "city": "Singapore",
        "country": "Singapore", "cc": "SG", "continent": "Asia",
        "lat": 1.3521, "lng": 103.8198, "l1": "Verdant Heavy Industries Ltd", "l2": "Global Sales & Distribution", "l3": None,
    },
    {
        "cu_id": 1053, "name": "New York Sales Office", "type": "site",
        "parent": 1003, "facility_type": "Office", "city": "New York",
        "country": "United States", "cc": "US", "continent": "North America",
        "lat": 40.7128, "lng": -74.0060, "l1": "Verdant Heavy Industries Ltd", "l2": "Global Sales & Distribution", "l3": None,
    },
]

# ---------------------------------------------------------------------------
# Emission sources per site  (answer_id, activity, question, question_group, unit)
# answer_ids start at 5000 and increment globally
# ---------------------------------------------------------------------------
ANSWER_ID_COUNTER = [5000]


def _aid() -> int:
    v = ANSWER_ID_COUNTER[0]
    ANSWER_ID_COUNTER[0] += 1
    return v


# Map site cu_id → list of source definitions
SITE_SOURCES: dict[int, list[dict[str, object]]] = {
    # Sheffield Steel Plant — Scope 1 & 2 heavy, S3 supply chain
    1020: [
        {"aid": _aid(), "activity": "Natural gas combustion — furnaces", "question": "Natural gas", "qg": "Combustion", "unit": "kWh"},
        {"aid": _aid(), "activity": "Coal & coke consumption — blast furnace", "question": "Coal & coke", "qg": "Combustion", "unit": "tonne"},
        {"aid": _aid(), "activity": "Electricity consumption — grid (National Grid)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Purchased iron ore & scrap — upstream", "question": "Raw materials", "qg": "Supply Chain", "unit": "tonne"},
        {"aid": _aid(), "activity": "Freight transport — road (inbound)", "question": "Freight — road", "qg": "Supply Chain", "unit": "tonne-km"},
    ],
    # Rotherham Fabrication
    1021: [
        {"aid": _aid(), "activity": "Natural gas combustion — heating", "question": "Natural gas", "qg": "Combustion", "unit": "kWh"},
        {"aid": _aid(), "activity": "Electricity consumption — grid (National Grid)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Purchased steel billets — upstream", "question": "Raw materials", "qg": "Supply Chain", "unit": "tonne"},
        {"aid": _aid(), "activity": "Business travel — road fleet", "question": "Fleet vehicles", "qg": "Transport", "unit": "km"},
    ],
    # Oslo Manufacturing
    1030: [
        {"aid": _aid(), "activity": "Electricity consumption — grid (NO hydro mix)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Process heat — industrial boilers", "question": "Natural gas", "qg": "Combustion", "unit": "kWh"},
        {"aid": _aid(), "activity": "Purchased components — upstream embodied", "question": "Raw materials", "qg": "Supply Chain", "unit": "tonne"},
        {"aid": _aid(), "activity": "Freight transport — maritime (inbound)", "question": "Freight — maritime", "qg": "Supply Chain", "unit": "tonne-km"},
    ],
    # Gothenburg Machinery Works
    1031: [
        {"aid": _aid(), "activity": "Electricity consumption — grid (SE mix)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "LPG combustion — welding operations", "question": "LPG", "qg": "Combustion", "unit": "litre"},
        {"aid": _aid(), "activity": "Purchased machinery components — upstream", "question": "Raw materials", "qg": "Supply Chain", "unit": "tonne"},
    ],
    # Helsinki Components
    1032: [
        {"aid": _aid(), "activity": "Electricity consumption — grid (FI mix)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "District heat consumption", "question": "District heating", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Aluminium components — upstream", "question": "Raw materials", "qg": "Supply Chain", "unit": "tonne"},
    ],
    # Copenhagen Distribution
    1033: [
        {"aid": _aid(), "activity": "Electricity consumption — grid (DK mix)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Diesel — forklift fleet", "question": "Diesel", "qg": "Combustion", "unit": "litre"},
        {"aid": _aid(), "activity": "Outbound freight — road", "question": "Freight — road", "qg": "Supply Chain", "unit": "tonne-km"},
    ],
    # Detroit Assembly
    1040: [
        {"aid": _aid(), "activity": "Natural gas combustion — assembly plant", "question": "Natural gas", "qg": "Combustion", "unit": "kWh"},
        {"aid": _aid(), "activity": "Electricity consumption — grid (MISO)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Purchased steel & alloys — upstream", "question": "Raw materials", "qg": "Supply Chain", "unit": "tonne"},
        {"aid": _aid(), "activity": "Fleet vehicles — gasoline", "question": "Fleet vehicles", "qg": "Transport", "unit": "litre"},
        {"aid": _aid(), "activity": "Employee commuting — private vehicle", "question": "Employee commuting", "qg": "Supply Chain", "unit": "km"},
    ],
    # Houston Processing
    1041: [
        {"aid": _aid(), "activity": "Natural gas combustion — process heat", "question": "Natural gas", "qg": "Combustion", "unit": "kWh"},
        {"aid": _aid(), "activity": "Electricity consumption — grid (ERCOT)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Diesel — onsite generators", "question": "Diesel", "qg": "Combustion", "unit": "litre"},
        {"aid": _aid(), "activity": "Purchased chemical inputs — upstream", "question": "Raw materials", "qg": "Supply Chain", "unit": "tonne"},
    ],
    # Toronto Manufacturing Hub
    1042: [
        {"aid": _aid(), "activity": "Natural gas combustion — space heating", "question": "Natural gas", "qg": "Combustion", "unit": "kWh"},
        {"aid": _aid(), "activity": "Electricity consumption — grid (Ontario mix)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Purchased metals — upstream", "question": "Raw materials", "qg": "Supply Chain", "unit": "tonne"},
    ],
    # Sales offices (lighter footprint — mainly S2 electricity + S3 business travel)
    1050: [  # London HQ
        {"aid": _aid(), "activity": "Electricity consumption — grid (National Grid)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Air travel — long haul (business class)", "question": "Air travel", "qg": "Supply Chain", "unit": "km"},
        {"aid": _aid(), "activity": "Air travel — short haul (economy)", "question": "Air travel", "qg": "Supply Chain", "unit": "km"},
    ],
    1051: [  # Frankfurt
        {"aid": _aid(), "activity": "Electricity consumption — grid (DE mix)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Air travel — business travel", "question": "Air travel", "qg": "Supply Chain", "unit": "km"},
    ],
    1052: [  # Singapore
        {"aid": _aid(), "activity": "Electricity consumption — grid (SG mix)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Air travel — APAC region", "question": "Air travel", "qg": "Supply Chain", "unit": "km"},
    ],
    1053: [  # New York
        {"aid": _aid(), "activity": "Electricity consumption — grid (NYISO)", "question": "Electricity", "qg": "Premises", "unit": "kWh"},
        {"aid": _aid(), "activity": "Air travel — transatlantic", "question": "Air travel", "qg": "Supply Chain", "unit": "km"},
    ],
}

# ---------------------------------------------------------------------------
# Emission factors (scope assignment + approximate kg CO2e / unit)
# Used only to derive realistic co2e_kg values; the actual EF source is
# the EcoOnline platform — this seed data is for demo purposes only.
# ---------------------------------------------------------------------------
SOURCE_CONFIG: dict[str, dict[str, object]] = {
    # question_group → default scope and EF guidance
    "Combustion":   {"scope": 1, "ef_range": (0.18, 0.25)},   # kg CO2e / kWh or per litre/tonne
    "Premises":     {"scope": 2, "ef_range": (0.05, 0.45)},   # electricity varies by grid
    "Supply Chain": {"scope": 3, "ef_range": (1.5, 12.0)},    # raw materials / freight
    "Transport":    {"scope": 1, "ef_range": (0.17, 0.24)},   # fleet (scope 1 direct)
}

MONTHLY_QUANTITY_RANGE: dict[str, tuple[float, float]] = {
    "kWh":      (50_000, 4_000_000),
    "tonne":    (20, 2_000),
    "litre":    (500, 50_000),
    "km":       (10_000, 500_000),
    "tonne-km": (100_000, 5_000_000),
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _monthly_value(unit: str) -> float:
    lo, hi = MONTHLY_QUANTITY_RANGE.get(unit, (100.0, 10_000.0))
    return round(random.uniform(lo, hi), 2)


def _co2e_kg(value: float, qg: str, year: int, is_upstream: bool = False) -> float:
    """Estimate CO2e_kg from quantity.  Apply a mild downward trend over years."""
    ef_range = SOURCE_CONFIG.get(qg, {}).get("ef_range", (0.2, 0.5))  # type: ignore[union-attr]
    ef = random.uniform(*ef_range)  # type: ignore[arg-type]
    # Slight year-over-year improvement (approx −2% per year from 2023)
    improvement = (year - 2023) * 0.02
    return round(value * ef * max(0.85, 1.0 - improvement), 2)


def _scope(qg: str) -> int:
    return SOURCE_CONFIG.get(qg, {}).get("scope", 3)  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Main seeding function
# ---------------------------------------------------------------------------


async def seed(db: AsyncSession) -> None:
    print("Seeding Verdant Heavy Industries Ltd...")

    # ── Organisation ─────────────────────────────────────────────────────────
    org = Organisation(
        company="Verdant Heavy Industries Ltd",
        root_company_unit_id=1000,
    )
    db.add(org)
    await db.flush()
    print(f"  Organisation: {org.company} ({org.id})")

    # ── Organisational Context ────────────────────────────────────────────────
    context = OrganisationalContext(
        organisation_id=org.id,
        industry_sector="Heavy Industrial Manufacturing",
        employee_count=4_200,
        annual_revenue_gbp=820_000_000,
        operating_geographies=["GB", "NO", "SE", "FI", "DK", "US", "CA", "DE", "SG"],
        sustainability_maturity="intermediate",
        budget_constraint_gbp=5_000_000,
        target_year=2040,
        notes=(
            "Verdant HI has committed to a 50% absolute reduction in Scope 1+2 by 2030 "
            "and Net Zero across all scopes by 2040. Primary abatement levers are "
            "electrification of furnaces, green hydrogen procurement, and supply chain "
            "engagement with key raw material suppliers."
        ),
    )
    db.add(context)
    await db.flush()

    # Emission targets
    target_2030 = EmissionTarget(
        organisation_id=org.id,
        target_year=2030,
        target_type="absolute",
        target_value_pct=50.0,
        baseline_year=2023,
        baseline_co2e_tonnes=185_000.0,
        target_co2e_tonnes=92_500.0,
        scope_coverage=[1, 2],
        source="internal",
        notes="50% Scope 1+2 reduction by 2030 (vs 2023 baseline)",
    )
    target_2040 = EmissionTarget(
        organisation_id=org.id,
        target_year=2040,
        target_type="absolute",
        target_value_pct=100.0,
        baseline_year=2023,
        baseline_co2e_tonnes=320_000.0,
        target_co2e_tonnes=0.0,
        scope_coverage=[1, 2, 3],
        source="internal",
        notes="Net Zero across all scopes by 2040",
    )
    db.add_all([target_2030, target_2040])

    # ── Company units ─────────────────────────────────────────────────────────
    cu_map: dict[int, CompanyUnit] = {}
    for u in ORG_UNITS:
        cu = CompanyUnit(
            organisation_id=org.id,
            company_unit_id=int(u["cu_id"]),  # type: ignore[arg-type]
            company_unit_name=str(u["name"]),
            company_unit_type=str(u["type"]),
            immediate_parent_id=u["parent"],  # type: ignore[arg-type]
            immediate_parent_name=None,
            facility_type=u["facility_type"],  # type: ignore[arg-type]
            city=u["city"],  # type: ignore[arg-type]
            country=u["country"],  # type: ignore[arg-type]
            country_code=u["cc"],  # type: ignore[arg-type]
            continent=u["continent"],  # type: ignore[arg-type]
            latitude=u["lat"],  # type: ignore[arg-type]
            longitude=u["lng"],  # type: ignore[arg-type]
            level_1=u["l1"],  # type: ignore[arg-type]
            level_2=u["l2"],  # type: ignore[arg-type]
            level_3=u["l3"],  # type: ignore[arg-type]
            open_date=date(2010, 1, 1),
            financial_year_start_day=1,
            financial_year_start_month=1,
        )
        db.add(cu)
        cu_map[int(u["cu_id"])] = cu  # type: ignore[arg-type]

    # Fill in denormalised parent names after all units are created
    for u in ORG_UNITS:
        if u["parent"] is not None:
            parent_unit = cu_map.get(int(u["parent"]))  # type: ignore[arg-type]
            if parent_unit:
                cu_map[int(u["cu_id"])].immediate_parent_name = parent_unit.company_unit_name  # type: ignore[arg-type]

    await db.flush()
    print(f"  CompanyUnits: {len(cu_map)} units created")

    # ── Emission sources & 36 months of records ───────────────────────────────
    total_sources = 0
    total_records = 0

    for cu_id, source_defs in SITE_SOURCES.items():
        cu = cu_map[cu_id]
        for sdef in source_defs:
            qg = str(sdef["qg"])
            src = EmissionSource(
                company_unit_id=cu.id,
                answer_id=int(sdef["aid"]),  # type: ignore[arg-type]
                activity=str(sdef["activity"]),
                question=str(sdef["question"]),
                question_group=qg,
                answer_unit=str(sdef["unit"]),
            )
            db.add(src)
            await db.flush()
            total_sources += 1

            base_scope = _scope(qg)
            unit_str = str(sdef["unit"])

            for year in range(2023, 2026):
                for month in range(1, 13):
                    # Add slight seasonal variation (higher in winter for heating/electricity)
                    seasonal = 1.0 + 0.15 * (1 if month in (1, 2, 11, 12) else -0.05)
                    value = round(_monthly_value(unit_str) * seasonal, 2)

                    # Location-based record
                    co2e_loc = _co2e_kg(value, qg, year)
                    rec_loc = EmissionRecord(
                        emission_source_id=src.id,
                        year=year,
                        month=month,
                        scope=base_scope,
                        market_factor_type="Location",
                        value=value,
                        co2e_kg=co2e_loc,
                        quality="Estimated" if qg == "Supply Chain" else "Actual",
                        upstream="Regular",
                    )
                    db.add(rec_loc)
                    total_records += 1

                    # Market-based record (Scope 2 only; similar but varies by ~5%)
                    if base_scope == 2:
                        market_factor = random.uniform(0.90, 1.10)
                        rec_mkt = EmissionRecord(
                            emission_source_id=src.id,
                            year=year,
                            month=month,
                            scope=base_scope,
                            market_factor_type="Market",
                            value=value,
                            co2e_kg=round(co2e_loc * market_factor, 2),
                            quality="Actual",
                            upstream="Regular",
                        )
                        db.add(rec_mkt)
                        total_records += 1

                    # Upstream T&D losses for electricity (Scope 3)
                    if qg == "Premises" and "Electricity" in str(sdef["activity"]):
                        rec_tnd = EmissionRecord(
                            emission_source_id=src.id,
                            year=year,
                            month=month,
                            scope=3,
                            market_factor_type="Location",
                            value=value,
                            co2e_kg=round(co2e_loc * 0.08, 2),  # ~8% T&D loss
                            quality="Estimated",
                            upstream="Upstream",
                            upstream_name="Electricity - T & D losses",
                        )
                        db.add(rec_tnd)
                        total_records += 1

        if total_records % 500 == 0:
            await db.flush()

    await db.flush()
    print(f"  EmissionSources: {total_sources}")
    print(f"  EmissionRecords: {total_records}")

    # ── Sync log ──────────────────────────────────────────────────────────────
    from datetime import datetime, timezone

    sync = SyncLog(
        organisation_id=org.id,
        sync_type="full",
        status="completed",
        records_created=total_sources + total_records,
        records_updated=0,
        started_at=datetime.now(tz=timezone.utc),
        completed_at=datetime.now(tz=timezone.utc),
    )
    db.add(sync)
    await db.commit()

    print(f"\nSeed complete. Dev token for org {org.id!r}:")
    from src.api.auth import generate_dev_token
    generate_dev_token(organisation_id=org.id)


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await seed(db)


if __name__ == "__main__":
    asyncio.run(main())
