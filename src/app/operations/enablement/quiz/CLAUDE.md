# Quiz Engine — CLAUDE.md

Daily quiz system that generates contextual questions, grades answers, and tracks a learner profile. Supports study guides and reading recommendations.

## Owns

- **_components/:** quiz-portal.tsx
- **_lib/:** quiz-data.ts (question definitions and types)
- **api/:** generate, grade, readings, study-guide, tips

## Status

Active.

## Connections

- Calls Anthropic API for question generation, grading, study guides, and tips
- Uses browser localStorage for learner profile and quiz history (no Supabase)
- Parent: enablement hub renders this as a tab
