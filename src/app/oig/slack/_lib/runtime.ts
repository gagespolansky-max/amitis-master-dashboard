import { searchFundDocs } from "@/app/oig/_shared/fund-doc-search"
import { updateSlackFundDocEvent } from "./event-log"
import {
  formatAmbiguousFundReply,
  formatFundDocSlackAnswer,
  formatMissingFundReply,
  formatMissingQuestionReply,
} from "./format"
import { formatFundChoicesForSlack, parseFundDocMention } from "./funds"
import { postSlackThreadReply } from "./slack-client"
import type { SlackAppMentionEvent } from "./slack-payload"

export async function processSlackFundDocMention(args: {
  eventId: string
  event: SlackAppMentionEvent
}): Promise<void> {
  const threadTs = args.event.thread_ts ?? args.event.ts

  try {
    await updateSlackFundDocEvent(args.eventId, {
      status: "processing",
      processedAt: new Date().toISOString(),
    })

    const parsed = parseFundDocMention(args.event.text)
    let replyText: string
    const fundSlug: string | null = parsed.fund?.slug ?? null
    let question: string | null = parsed.question || null

    if (parsed.reason === "missing_fund") {
      replyText = formatMissingFundReply(formatFundChoicesForSlack())
      question = parsed.cleanedText || null
    } else if (parsed.reason === "ambiguous_fund") {
      replyText = formatAmbiguousFundReply(parsed.candidateFunds)
    } else if (parsed.reason === "missing_question" && parsed.fund) {
      replyText = formatMissingQuestionReply(parsed.fund)
    } else if (parsed.fund) {
      const result = await searchFundDocs({
        fundSlug: parsed.fund.slug,
        question: parsed.question,
      })
      replyText = formatFundDocSlackAnswer(result, parsed.fund)
    } else {
      replyText = formatMissingFundReply(formatFundChoicesForSlack())
    }

    const responseTs = await postSlackThreadReply({
      channel: args.event.channel,
      threadTs,
      text: replyText,
    })

    await updateSlackFundDocEvent(args.eventId, {
      status: "answered",
      fundSlug,
      question,
      responseTs,
      error: null,
      processedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    await updateSlackFundDocEvent(args.eventId, {
      status: "failed",
      error: message,
      processedAt: new Date().toISOString(),
    }).catch((updateError) => {
      console.error(
        `[fund-doc-slack] failed to update event ${args.eventId}: ${
          updateError instanceof Error ? updateError.message : String(updateError)
        }`,
      )
    })

    await postSlackThreadReply({
      channel: args.event.channel,
      threadTs,
      text:
        "I hit an error while searching the indexed fund documents. " +
        "The event was logged for follow-up, and I did not guess from memory.",
    }).catch((postError) => {
      console.error(
        `[fund-doc-slack] failed to post error reply for ${args.eventId}: ${
          postError instanceof Error ? postError.message : String(postError)
        }`,
      )
    })
  }
}
