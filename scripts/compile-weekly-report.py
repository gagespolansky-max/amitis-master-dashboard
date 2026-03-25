import json
from datetime import datetime, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
SUGGESTIONS_FILE = DATA_DIR / "suggestions.json"
REPORTS_FILE = DATA_DIR / "weekly-reports.json"

def compile_report():
    suggestions = json.loads(SUGGESTIONS_FILE.read_text()) if SUGGESTIONS_FILE.exists() else []
    reports = json.loads(REPORTS_FILE.read_text()) if REPORTS_FILE.exists() else []

    today = datetime.now()
    week_start = today - timedelta(days=today.weekday())
    week_label = f"Week of {week_start.strftime('%b %d, %Y')}"

    week_suggestions = [
        s for s in suggestions
        if s.get("date", "") >= week_start.strftime("%Y-%m-%d")
    ]

    if not week_suggestions:
        print("No new suggestions this week.")
        return

    existing = next((r for r in reports if r["week"] == week_label), None)
    if existing:
        existing["suggestions"] = week_suggestions
    else:
        reports.insert(0, {
            "week": week_label,
            "suggestions": week_suggestions,
        })

    REPORTS_FILE.write_text(json.dumps(reports, indent=2))

    carried = [s for s in suggestions if s.get("date", "") < week_start.strftime("%Y-%m-%d")]
    SUGGESTIONS_FILE.write_text(json.dumps(carried, indent=2))

    print(f"Compiled {len(week_suggestions)} suggestions into report for {week_label}")

if __name__ == "__main__":
    compile_report()
