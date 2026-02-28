"""Generate a dev JWT token for the first seeded organisation."""
import asyncio
from sqlalchemy import text
from src.models.database import AsyncSessionLocal
from src.api.auth import generate_dev_token


async def main() -> None:
    async with AsyncSessionLocal() as db:
        row = (
            await db.execute(text("SELECT id, company FROM organisations LIMIT 1"))
        ).fetchone()
        if row:
            generate_dev_token(organisation_id=str(row.id))
        else:
            print("No organisation found — run: make seed")


if __name__ == "__main__":
    asyncio.run(main())
