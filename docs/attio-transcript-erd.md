# Attio Transcript Supabase ERD

This diagram covers the neutral data-layer tables used by the Attio transcript ingestion module.

```mermaid
erDiagram
  call_transcripts {
    uuid id PK
    text attio_workspace_id
    text attio_meeting_id UK
    text attio_call_recording_id UK
    text attio_call_recording_status
    timestamptz attio_created_at
    timestamptz call_date
    text title
    text raw_transcript
    jsonb transcript_segments
    jsonb summary
    jsonb classification
    text_array labels
    attio_transcript_status status
    text source_url
    text processing_error
    timestamptz processed_at
    timestamptz reviewed_at
    text reviewed_by
    timestamptz created_at
    timestamptz updated_at
  }

  call_participants {
    uuid id PK
    uuid call_transcript_id FK
    text display_name
    text email
    text firm_name
    text attio_person_id
    text attio_company_id
    text company_identity_id
    text person_identity_id
    text participant_identity_id
    text inferred_role
    boolean is_organizer
    jsonb raw
    timestamptz created_at
    timestamptz updated_at
  }

  counterparty_profiles {
    uuid id PK
    text name
    text domain UK
    text attio_company_id UK
    text profile_summary
    text relationship_status
    text_array current_needs
    text_array preferences
    text_array risks
    timestamptz last_call_at
    integer source_observation_count
    uuid_array synthesized_from_observation_ids
    jsonb synthesis_payload
    timestamptz created_at
    timestamptz updated_at
  }

  counterparty_observations {
    uuid id PK
    uuid counterparty_profile_id FK
    uuid call_transcript_id FK
    uuid call_participant_id FK
    timestamptz observation_date
    text topic
    text observation_type
    text claim
    text evidence
    text speaker_name
    numeric confidence
    jsonb metadata
    timestamptz created_at
  }

  llm_call_log {
    uuid id PK
    uuid call_transcript_id FK
    uuid counterparty_profile_id FK
    text task
    text prompt_version
    text model
    jsonb input_payload
    jsonb output_payload
    text raw_output
    integer latency_ms
    integer input_tokens
    integer output_tokens
    text error
    timestamptz created_at
  }

  call_transcripts ||--o{ call_participants : "has participants; delete cascades"
  call_transcripts ||--o{ counterparty_observations : "source transcript; delete cascades"
  call_participants |o--o{ counterparty_observations : "optional speaker; delete sets null"
  counterparty_profiles ||--o{ counterparty_observations : "has observations; delete cascades"
  call_transcripts |o--o{ llm_call_log : "analysis audit; delete sets null"
  counterparty_profiles |o--o{ llm_call_log : "synthesis audit; delete sets null"
```

## Review Gate

```mermaid
flowchart LR
  attio[Attio completed meeting call recording]
  transcript[call_transcripts]
  participants[call_participants]
  analyze[Anthropic transcript analysis]
  observations[counterparty_observations]
  profiles[counterparty_profiles]
  log[llm_call_log]
  review{Review queue status}
  ignored[ignored]
  reviewed[reviewed]
  operational[Operational query helpers]

  attio --> transcript
  transcript --> participants
  transcript --> analyze
  analyze --> observations
  analyze --> log
  observations --> profiles
  profiles --> log
  transcript --> review
  review --> ignored
  review --> reviewed
  reviewed --> operational
```

Operational helpers should only expose observations joined to transcripts where `call_transcripts.status = 'reviewed'`.

## Constraints And Indexes

- `call_transcripts`: unique `(attio_meeting_id, attio_call_recording_id)`, indexed by `status + call_date`, `call_date`, and `labels`.
- `call_participants`: unique participant per transcript by Attio person id or lowercase email.
- `counterparty_profiles`: unique by `attio_company_id` when present, otherwise unique by `domain` when present.
- `counterparty_observations`: unique `(call_transcript_id, topic, claim, speaker_name)`.
- `llm_call_log`: indexed by transcript, profile, and task for audit lookups.
