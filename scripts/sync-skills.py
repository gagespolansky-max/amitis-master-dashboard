#!/usr/bin/env python3
"""
Scan ~/.claude/skills/ and ~/.claude/plugins/ for SKILL.md files,
then sync them to skill_proposals in Supabase for approval review.
"""

import os
import re
import json
from pathlib import Path

try:
    import requests
except ImportError:
    print("Missing 'requests' package. Install with: pip install requests")
    exit(1)

SUPABASE_URL = "https://njmqygpadjqlnbinblun.supabase.co"
SUPABASE_ANON_KEY = None

SKILL_DIRS = [
    Path.home() / ".claude" / "skills",
    Path.home() / ".claude" / "plugins",
]


def load_env():
    global SUPABASE_URL, SUPABASE_ANON_KEY

    SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
    url_from_env = os.environ.get("SUPABASE_URL")
    if url_from_env:
        SUPABASE_URL = url_from_env

    if not SUPABASE_ANON_KEY:
        env_file = Path.home() / "master-dashboard" / ".env.local"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                line = line.strip()
                if line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key == "SUPABASE_ANON_KEY" and not SUPABASE_ANON_KEY:
                    SUPABASE_ANON_KEY = val
                if key == "SUPABASE_URL":
                    SUPABASE_URL = val

    if not SUPABASE_ANON_KEY:
        print("Error: SUPABASE_ANON_KEY not found in environment or .env.local")
        exit(1)


def headers():
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def parse_frontmatter(content):
    match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return None, None
    fm = match.group(1)
    name = None
    description = None
    for line in fm.splitlines():
        if line.startswith("name:"):
            name = line.split(":", 1)[1].strip()
        if line.startswith("description:"):
            desc_val = line.split(":", 1)[1].strip()
            if desc_val and desc_val != "|":
                description = desc_val
    if description is None:
        desc_match = re.search(r"description:\s*\|\s*\n(.*?)(?=\n\w|\n---|\Z)", fm, re.DOTALL)
        if desc_match:
            description = desc_match.group(1).strip()
    return name, description


def find_skill_files():
    skills = []
    for skill_dir in SKILL_DIRS:
        if not skill_dir.exists():
            continue
        for skill_md in skill_dir.rglob("SKILL.md"):
            content = skill_md.read_text()
            name, description = parse_frontmatter(content)
            if name:
                skills.append({
                    "name": name,
                    "description": description or "",
                    "content": content,
                    "path": str(skill_md),
                })
    return skills


def check_catalog(name):
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/skill_catalog",
        headers=headers(),
        params={"name": f"eq.{name}", "select": "id,name"},
    )
    resp.raise_for_status()
    return len(resp.json()) > 0


def check_pending_submission(name):
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/skill_proposals",
        headers=headers(),
        params={
            "title": f"eq.{name}",
            "type": "eq.submission",
            "status": "eq.pending_review",
            "select": "id,title",
        },
    )
    resp.raise_for_status()
    return len(resp.json()) > 0


def create_submission(skill):
    payload = {
        "type": "submission",
        "title": skill["name"],
        "description": skill["description"],
        "submitted_skill_md": skill["content"],
        "submitted_from": "claude-code",
        "requested_by": "sync-skills-script",
        "status": "pending_review",
        "priority": "medium",
    }
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/skill_proposals",
        headers=headers(),
        json=payload,
    )
    resp.raise_for_status()
    return resp.json()


def main():
    load_env()

    skills = find_skill_files()
    print(f"Found {len(skills)} skill(s) with SKILL.md files\n")

    in_catalog = 0
    new_submissions = 0
    already_pending = 0

    for skill in skills:
        name = skill["name"]

        if check_catalog(name):
            print(f"  [catalog] {name} — already in skill_catalog, skipping")
            in_catalog += 1
            continue

        if check_pending_submission(name):
            print(f"  [pending] {name} — already has pending submission, skipping")
            already_pending += 1
            continue

        create_submission(skill)
        print(f"  [created] {name} — new submission created")
        new_submissions += 1

    print(f"\nSummary: Found {len(skills)} skills, {in_catalog} already in catalog, {new_submissions} new submissions created")
    if already_pending:
        print(f"  ({already_pending} already had pending submissions)")


if __name__ == "__main__":
    main()
