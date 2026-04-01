# Architecture Lab — CLAUDE.md

Interactive lab for learning agentic architectures. Includes architecture challenges with stress testing, grading, diagram generation, and a 6-step workflow builder.

## Owns

- **_components/:** architecture-lab, systems-lab, agentic-architectures, workflow-builder
- **_lib/:** lab-types.ts, workflow-types.ts, systems-lab-data.ts
- **api/:** flash, generate, grade, diagram, stress-test, workflow

## Status

Active.

## Connections

- Calls Anthropic API for challenge generation, grading, stress tests, diagrams, and workflow building
- Uses browser localStorage for lab history and scenario history (no Supabase)
- Parent: enablement hub renders this as a tab
