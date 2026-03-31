import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Load env vars from multiple sources
from dotenv import load_dotenv

load_dotenv(Path.home() / "fund-return-dashboard" / ".env")
load_dotenv(Path.home() / "token-dashboard" / ".env.local")
load_dotenv(Path.home() / "gmail-fund-returns" / ".env")

import anthropic
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import requests

DATA_DIR = Path(__file__).parent.parent / "data"
PRIORITIES_FILE = DATA_DIR / "priorities.json"
GMAIL_CREDS_DIR = Path.home() / "fund-return-dashboard"


def get_gmail_service():
    token_path = GMAIL_CREDS_DIR / "token.json"
    creds_path = GMAIL_CREDS_DIR / "credentials.json"

    if not token_path.exists():
        print("Gmail token not found. Run fund-return-dashboard first to authenticate.")
        return None

    creds = Credentials.from_authorized_user_file(str(token_path))
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_path.write_text(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def fetch_recent_emails(service, days=7, max_results=20):
    after_date = (datetime.now() - timedelta(days=days)).strftime("%Y/%m/%d")
    query = f"after:{after_date} is:inbox -category:promotions -category:social"

    results = service.users().messages().list(
        userId="me", q=query, maxResults=max_results
    ).execute()

    messages = results.get("messages", [])
    emails = []

    for msg in messages:
        detail = service.users().messages().get(
            userId="me", id=msg["id"], format="metadata",
            metadataHeaders=["From", "Subject", "Date"]
        ).execute()

        headers = {h["name"]: h["value"] for h in detail.get("payload", {}).get("headers", [])}
        snippet = detail.get("snippet", "")

        emails.append({
            "from": headers.get("From", "Unknown"),
            "subject": headers.get("Subject", "No subject"),
            "date": headers.get("Date", ""),
            "snippet": snippet[:200],
        })

    return emails


def fetch_attio_data():
    api_key = os.getenv("ATTIO_API_KEY")
    if not api_key:
        print("ATTIO_API_KEY not found.")
        return {"tasks": [], "notes": []}

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    tasks = []
    try:
        resp = requests.post(
            "https://api.attio.com/v2/tasks/query",
            headers=headers,
            json={"sort": {"field": "deadline", "direction": "asc"}, "limit": 20},
        )
        if resp.ok:
            tasks = resp.json().get("data", [])
    except Exception as e:
        print(f"Attio tasks error: {e}")

    notes = []
    try:
        resp = requests.post(
            "https://api.attio.com/v2/notes/query",
            headers=headers,
            json={"limit": 10},
        )
        if resp.ok:
            notes = resp.json().get("data", [])
    except Exception as e:
        print(f"Attio notes error: {e}")

    return {"tasks": tasks, "notes": notes}


def rank_priorities(emails, attio_data):
    client = anthropic.Anthropic()

    prompt = f"""You are a priority ranker for an investment associate at a hedge fund / family office.

Given the following data from their email and CRM, extract and rank their priorities into three categories:

1. **this_week** — urgent items needing action in the next 7 days (reply to emails, prep for calls, follow-ups, deadlines)
2. **this_month** — monthly deliverables and medium-term items (fund returns reporting, investor updates, accounting tasks)
3. **on_deck** — strategic items to keep visible but not urgent (new deals, project scoping, longer-term initiatives)

## Recent Emails
{json.dumps(emails, indent=2)}

## Attio Tasks & Notes
{json.dumps(attio_data, indent=2)}

## Rules
- Each priority needs: title (short, actionable), description (1 sentence), source ("email" | "attio" | "inferred"), urgency ("high" | "medium" | "low")
- Be specific — "Reply to John's email about Q4 returns" not "Check emails"
- Ignore newsletters, marketing, and spam
- If an email is clearly informational with no action needed, skip it
- Limit to ~5-8 items per category max
- Rank within each category by urgency

Return valid JSON only, no markdown:
{{
  "this_week": [{{ "id": "tw-1", "title": "...", "description": "...", "source": "...", "urgency": "..." }}],
  "this_month": [{{ "id": "tm-1", "title": "...", "description": "...", "source": "...", "urgency": "..." }}],
  "on_deck": [{{ "id": "od-1", "title": "...", "description": "...", "source": "...", "urgency": "..." }}]
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",  # Stable Sonnet 4 model ID
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]

    return json.loads(text)


def merge_with_existing(new_priorities, existing_priorities):
    """Preserve manually reordered items, add new ones."""
    for column in ["this_week", "this_month", "on_deck"]:
        existing_ids = {p["id"] for p in existing_priorities.get(column, []) if p.get("pinned")}
        pinned = [p for p in existing_priorities.get(column, []) if p.get("pinned")]
        new_items = [p for p in new_priorities.get(column, []) if p["id"] not in existing_ids]
        new_priorities[column] = pinned + new_items

    return new_priorities


def main():
    print("Refreshing priorities...")

    emails = []
    gmail = get_gmail_service()
    if gmail:
        emails = fetch_recent_emails(gmail)
        print(f"Fetched {len(emails)} emails")

    attio_data = fetch_attio_data()
    print(f"Fetched {len(attio_data['tasks'])} tasks, {len(attio_data['notes'])} notes from Attio")

    if not emails and not attio_data["tasks"]:
        print("No data to process.")
        return

    existing = json.loads(PRIORITIES_FILE.read_text()) if PRIORITIES_FILE.exists() else {}

    priorities = rank_priorities(emails, attio_data)
    priorities = merge_with_existing(priorities, existing)
    priorities["last_refreshed"] = datetime.now().isoformat()

    # Write local backup
    PRIORITIES_FILE.write_text(json.dumps(priorities, indent=2))
    count = sum(len(priorities[c]) for c in ['this_week', 'this_month', 'on_deck'])
    print(f"Priorities updated locally: {count} items")

    # POST to API (works for both local dev and deployed)
    api_url = os.getenv("PRIORITIES_API_URL", "http://localhost:3000/api/priorities")
    try:
        resp = requests.post(api_url, json=priorities, timeout=10)
        if resp.ok:
            print(f"Synced to API: {api_url}")
        else:
            print(f"API sync failed ({resp.status_code}): {resp.text}")
    except Exception as e:
        print(f"API sync skipped (not running?): {e}")


if __name__ == "__main__":
    main()
