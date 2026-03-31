"""One-time script to seed Supabase priorities table from data/priorities.json."""

import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Load env from master-dashboard
load_dotenv(Path(__file__).parent.parent / ".env.local")

from supabase import create_client

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
PRIORITIES_FILE = Path(__file__).parent.parent / "data" / "priorities.json"


def main():
    if not PRIORITIES_FILE.exists():
        print("No priorities.json found.")
        return

    data = json.loads(PRIORITIES_FILE.read_text())
    last_refreshed = data.pop("last_refreshed", None)
    board_state = data  # remaining keys: this_week, this_month, on_deck

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Delete the empty seed row if it exists
    supabase.table("priorities").delete().is_("last_refreshed", "null").execute()

    # Insert current data
    result = supabase.table("priorities").insert({
        "board_state": board_state,
        "last_refreshed": last_refreshed,
    }).execute()

    print(f"Seeded priorities table with {sum(len(board_state[c]) for c in board_state)} items.")
    print(f"Row ID: {result.data[0]['id']}")


if __name__ == "__main__":
    main()
