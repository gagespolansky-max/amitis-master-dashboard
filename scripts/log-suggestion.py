import json
import sys
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
SUGGESTIONS_FILE = DATA_DIR / "suggestions.json"

def log_suggestion(suggestion_type, title, description, status="pending"):
    suggestions = json.loads(SUGGESTIONS_FILE.read_text()) if SUGGESTIONS_FILE.exists() else []

    suggestions.append({
        "date": datetime.now().strftime("%Y-%m-%d"),
        "type": suggestion_type,
        "title": title,
        "description": description,
        "status": status,
    })

    SUGGESTIONS_FILE.write_text(json.dumps(suggestions, indent=2))
    print(f"Logged: [{suggestion_type}] {title}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python log-suggestion.py <type> <title> <description> [status]")
        sys.exit(1)

    s_type = sys.argv[1]
    s_title = sys.argv[2]
    s_desc = sys.argv[3]
    s_status = sys.argv[4] if len(sys.argv) > 4 else "pending"
    log_suggestion(s_type, s_title, s_desc, s_status)
