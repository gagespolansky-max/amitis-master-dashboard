# Attio Transcript Slack Agent

This optional notifier posts a Slack-friendly summary after a new Attio transcript is ingested, analyzed, written to Supabase, and marked `ready_for_review`.

The Slack summary is produced by a separate LLM step with prompt version `attio-transcript-slack-summary-v1`. It does not reuse the internal CRM summary verbatim; it converts the structured transcript analysis into a concise Slack update.

The prompt requires `call_recap_sections` as structured JSON:

```json
[
  {
    "title": "phase/topic title",
    "body": "1-3 sentences describing this phase/topic"
  }
]
```

The renderer turns those sections into the Slack `Call recap` block. This keeps the recap narrative and phase-based, while the separate Action items / Key points / Open questions / Relationship signals blocks remain list-based.

The recap writing standard lives in `src/lib/data-layer/attio-transcripts/agents/skills/call-recap-skill.md`. Future Call Lab Agent prompts should reference that skill before producing `call_recap_sections`.

The agent-level contract lives in `src/lib/data-layer/attio-transcripts/agents/call-lab-agent.md`. Slack is only the delivery surface; the Call Lab Agent owns the call intelligence and uses the Call Recap Skill for recap sections.

## What It Posts

The message is built from the Slack agent's JSON output, which is generated from the already-extracted transcript analysis and participant metadata.

- Call title, date, type, sentiment, and labels
- External counterparties grouped by company identity, with company ID, person ID, and composite participant ID
- Amitis participants with their own person identity IDs
- Call recap up to 500 words, organized by topic or call phase
- Action items from follow-ups, asks, and next steps
- Key points
- Open questions
- Risks
- Relationship signals
- Number of observations written and profiles updated
- Review queue link when configured
- Attio source call link when available

Raw transcript text and LLM payload bodies are not posted.

## Participant Identity Format

The transcript intake layer treats a participant identity as two explicit IDs:

- `company_identity_id` - company / firm side of the identity
- `person_identity_id` - individual side of the identity

Those two values are hashed into:

- `participant_identity_id`

Attio IDs are preferred when available. If Attio does not expose a per-participant ID, the intake layer falls back to email/domain-derived IDs, for example:

- company: `attio_company:<uuid>` or `domain:veloxtrading.ai`
- person: `attio_person:<uuid>` or `email:joshua@veloxtrading.ai`
- pair: `participant:<sha256-prefix>`

Amitis participants use the Amitis domain as the company identity and their email as the person identity when no Attio person ID is present.

## Required Env Vars

- `ATTIO_TRANSCRIPT_SLACK_BOT_TOKEN`
- `ATTIO_TRANSCRIPT_SLACK_CHANNEL_ID`

Optional:

- `ATTIO_TRANSCRIPT_REVIEW_URL` - explicit review queue URL for Slack links
- `NEXT_PUBLIC_APP_URL` - fallback base URL used to build `/data-layer/attio-transcripts/review`

## Slack App Requirements

The bot token needs permission to call `chat.postMessage`, typically via the `chat:write` bot scope. The bot must also be invited to the destination channel.

## Failure Behavior

Slack posting is best-effort. If Slack is not configured, ingestion continues silently. If Slack returns an error, ingestion logs an error message and still completes.

The Slack summary LLM call is also best-effort. A failure is logged to `llm_call_log` with task `slack_call_summary` when possible, but it does not fail transcript ingestion.

## Trigger Point

The notifier runs only when a processed transcript reaches `ready_for_review`. Transcripts with no external participants, no transcript text, no observations, or processing errors are not posted.
