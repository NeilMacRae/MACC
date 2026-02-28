import asyncio
import os
import sys
sys.path.insert(0, '.')

from httpx import AsyncClient, ASGITransport
from src.api.main import app
from src.api.auth import generate_dev_token

ORG_ID = "d1a6ea73-9a1d-4372-a874-ab1271272740"
TOKEN = generate_dev_token(ORG_ID, os.getenv("JWT_SECRET", "dev-secret-key-change-in-production"))
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

async def main():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/v1/health")
        print("health:", r.status_code)

        r2 = await c.get("/api/v1/emissions/overview", headers=HEADERS)
        print("overview:", r2.status_code)
        if r2.status_code == 200:
            d = r2.json()
            print("  total_co2e_tonnes:", d["total_co2e_tonnes"])
            print("  year:", d["year"])
            print("  scopes:", {k: v["co2e_tonnes"] for k, v in d["by_scope"].items()})
            print("  top 3 sources:", [s["activity"][:40] for s in d["top_sources"][:3]])
        else:
            print("  error:", r2.text[:400])

        r3 = await c.get("/api/v1/emissions/hierarchy", headers=HEADERS)
        print("hierarchy:", r3.status_code)
        if r3.status_code == 200:
            d = r3.json()
            root = d["root"]
            print("  root:", root["company_unit_name"], "co2e:", root["total_co2e_tonnes"])
            print("  children:", [c["company_unit_name"] for c in root["children"]])

        r4 = await c.get("/api/v1/emissions/trends", headers=HEADERS)
        print("trends:", r4.status_code)
        if r4.status_code == 200:
            d = r4.json()
            print("  years:", [(t["year"], t["co2e_tonnes"]) for t in d["trends"]])

asyncio.run(main())
