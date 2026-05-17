# Call Recap Skill

Sub-skill invoked by the Call Lab Agent after an Attio call has been ingested and analyzed. Produces the narrative recap section of the Slack post.

## Scope

This skill produces only the recap: the narrative portion of the Slack post. It does not produce, repeat, or summarize any of the sibling sections, which are generated separately and appear in every call summary:

- Action items
- Key points
- Open questions
- Relationship signals
- Risks

If the recap is restating those bullets in prose, it is failing. The recap exists to do something the bullets cannot: tell the story of how the call actually unfolded.

## What The Recap Is For

The recap walks the reader through the call by topic or call phase, so that someone who was not on the call understands what was actually discussed, in what order, and what the substance of each thread was. It is the connective tissue between the bullets.

A good recap answers: if I had been on this call, what would I have heard happen?

It does not answer: what are the takeaways? Key points handle that. What do we need to do? Action items handle that. What is still unclear? Open questions handle that. How is the relationship? Relationship signals handle that.

## Output Contract

Return structured JSON. The parent agent handles Slack formatting.

```json
{
  "call_recap_sections": [
    {
      "title": "Short, specific section title",
      "body": "2-4 sentences describing what was discussed in this part of the call."
    }
  ]
}
```

Constraints:

- 2-5 sections per recap
- Total recap under 700 words
- Section titles describe the topic or phase, not the takeaway

## Section Structure: Topics Or Phases

The recap is organized one of two ways. Pick whichever fits the actual call.

By topic, when the call covered several distinct subject areas:

- Fund strategy and positioning
- Team and operating model
- Fee structure
- Pipeline review
- Macro outlook
- LP feedback on Q3 letter

By phase, when the call moved through a sequence:

- Opening context and why the call happened
- Main discussion
- Diligence questions
- Next steps and logistics

Most calls fit better into topic-based sections. Use phase-based only when the call has a clear narrative arc, such as a first intro call that opens with background, moves into strategy, then closes with next steps.

Do not force a fixed template. A 20-minute portfolio check-in might warrant 2 sections; a 90-minute GP diligence call might warrant 5.

## What Each Section Must Contain

Each section describes what was discussed on that topic or in that phase. That means:

- The substance of the conversation: what was said, what was claimed, what was explored
- Who said what, when the speaker is identifiable and relevant
- Context the reader needs to understand the topic
- Any nuance, hedging, or uncertainty in how the topic was handled

Each section does not contain:

- Action items derived from the discussion
- Takeaways or key insights
- Relationship commentary
- Risk flags
- Open questions

If you find yourself writing "the team decided to..." or "this means Amitis should..." stop. That belongs in Action items, not the recap.

## Style

- Plain English suitable for Slack.
- Use real names when the speaker or owner is clear, such as Adil, Chris, Vin. Avoid "the team" when you can be specific.
- Treat the transcript and analysis as evidence. Do not invent facts, commitments, dates, motivations, or framing not supported by the source.
- Mention uncertainty explicitly when the transcript is ambiguous.
- Avoid filler openers like "Discussion centered on" or "Conversation touched on" unless immediately followed by concrete substance.
- No em dashes.
- No hype.
- Direct and factual.
- Section titles are descriptive phrases of the topic, not labels. Use "Velox fee structure and side letter terms", not "Fee Discussion".

## Pattern Comparison

Weak recap, from the screenshot, to avoid:

```text
Due Diligence Preparation
Adil acknowledged he had not completed his deep dive preparation materials before the meeting. The team decided to attend Vin's upcoming three-hour ODD session as observers rather than lead with formal Q&A.

Meeting Logistics
Discussion centered on improving meeting logistics, including switching to Zoom for better cross-platform compatibility and adding JP and Sean to future sessions. The team preferred maintaining the casual, organic conversation approach.

Casual Biotech Discussion
Conversation touched on Adil's son's biotech company Latch Bio, maintaining the comfortable, relationship-building atmosphere typical of lunch meetings.
```

Why it fails:

- Every sentence is already in Action items, Key points, or Relationship signals below it
- "Discussion centered on" and "Conversation touched on" with no added substance
- Generic titles
- Reads like a meeting-notes auto-summary, not a narrative

Strong recap, same call, narrative-first:

```text
Why the call happened and how it was framed
The group convened as a Velox follow-up, but Adil opened by saying he had not completed the deeper question set he had planned to bring. That reframed the call from formal diligence into a looser working session, with the group treating it as coordination rather than a structured Q&A.

How the team is approaching Velox diligence from here
Most of the substantive conversation went to how Amitis should engage with Velox going forward. Rather than running a parallel diligence track, the group converged on attending Vin's upcoming three-hour ODD session as observers. The reasoning was that listening to someone else's operational diligence would surface more than another round of Amitis-led questions at this stage.

Logistics and who should be in the room
A shorter thread covered mechanics: moving future calls to Zoom for platform reasons, and pulling JP and Sean into the next session. These came up as practical fixes rather than a structured agenda item.

Off-topic threads
The call included casual conversation, notably about Adil's son's biotech company, Latch Bio. It was not relevant to Velox but is worth noting as context for the overall tone of the meeting.
```

Why it works:

- Tells you what happened in the room, in roughly the order it happened
- Distinguishes between the main thread, Velox diligence approach, and shorter threads, logistics and off-topic discussion
- Does not preempt Action items, Key points, or Relationship signals
- A reader who only read the recap would understand the call

## Examples Across Call Types

To reinforce that this skill is general-purpose, here are section title patterns for different call types.

GP diligence call:

- Fund strategy and how the manager described their edge
- Team composition and recent changes
- Portfolio construction and current positioning
- Fee discussion

LP update / IR call:

- Performance context the LP wanted to discuss
- Questions on portfolio exposures
- Forward-looking conversation on the pipeline

Internal strategy call:

- Framing of the decision being discussed
- Where the team agreed and where they did not
- What was deferred to a later conversation

Prospect meeting:

- How the prospect described their mandate
- Amitis's positioning pitch and what landed
- Follow-up topics flagged for the next conversation

In every case, the section titles describe what was talked about, not what to do about it.
