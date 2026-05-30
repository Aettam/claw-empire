import type { Lang } from "../../../types/lang.ts";

type DbLike = {
  prepare: (sql: string) => {
    get: (...args: any[]) => unknown;
    all: (...args: any[]) => unknown;
  };
};

type CreateConversationContextToolsDeps = {
  db: DbLike;
  normalizeStreamChunk: (raw: Buffer | string, opts?: { dropCliNoise?: boolean }) => string;
  summarizeForMeetingBubble: (text: string, maxChars?: number, lang?: Lang) => string;
};

export function createConversationContextTools(deps: CreateConversationContextToolsDeps) {
  const { db, normalizeStreamChunk, summarizeForMeetingBubble } = deps;

  const CONTEXT_BUDGET_CHARS = 3000;
  const PER_MESSAGE_MAX_CHARS = 800;

  function getRecentConversationContext(agentId: string, limit = 10): string {
    const msgs = db
      .prepare(
        `
    SELECT sender_type, sender_id, content, message_type, created_at
    FROM messages
    WHERE (
      (sender_type = 'ceo' AND receiver_type = 'agent' AND receiver_id = ?)
      OR (sender_type = 'agent' AND sender_id = ?)
      OR (receiver_type = 'all')
    )
    ORDER BY created_at DESC
    LIMIT ?
  `,
      )
      .all(agentId, agentId, limit) as Array<{
      sender_type: string;
      sender_id: string | null;
      content: string;
      message_type: string;
      created_at: number;
    }>;

    if (msgs.length === 0) return "";

    const chronological = msgs.reverse();
    const rendered = chronological.map((m) => {
      const role = m.sender_type === "ceo" ? "CEO" : "Agent";
      const type = m.message_type !== "chat" ? ` [${m.message_type}]` : "";
      const body =
        m.content.length > PER_MESSAGE_MAX_CHARS
          ? `${m.content.slice(0, PER_MESSAGE_MAX_CHARS)}…[truncated]`
          : m.content;
      return `${role}${type}: ${body}`;
    });

    const kept: string[] = [];
    let total = 0;
    let dropped = 0;
    for (let i = rendered.length - 1; i >= 0; i--) {
      const line = rendered[i];
      if (total + line.length + 1 > CONTEXT_BUDGET_CHARS && kept.length > 0) {
        dropped = i + 1;
        break;
      }
      kept.unshift(line);
      total += line.length + 1;
    }
    if (dropped > 0) {
      kept.unshift(`[${dropped} older message(s) omitted to stay within context budget]`);
    }

    return `\n\n--- Recent conversation context ---\n${kept.join("\n")}\n--- End context ---`;
  }

  function extractLatestProjectMemoBlock(description: string, maxChars = 1600): string {
    if (!description) return "";
    const marker = "[PROJECT MEMO]";
    const idx = description.lastIndexOf(marker);
    if (idx < 0) return "";
    const block = description
      .slice(idx)
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!block) return "";
    return block.length > maxChars ? `...${block.slice(-maxChars)}` : block;
  }

  function getTaskContinuationContext(taskId: string): string {
    const runCountRow = db
      .prepare(
        `
    SELECT COUNT(*) AS cnt
    FROM task_logs
    WHERE task_id = ?
      AND kind = 'system'
      AND message LIKE 'RUN start%'
  `,
      )
      .get(taskId) as { cnt: number } | undefined;
    if ((runCountRow?.cnt ?? 0) === 0) return "";

    const taskRow = db.prepare("SELECT description, result FROM tasks WHERE id = ?").get(taskId) as
      | { description: string | null; result: string | null }
      | undefined;

    const latestRunSummary = db
      .prepare(
        `
    SELECT message
    FROM task_logs
    WHERE task_id = ?
      AND kind = 'system'
      AND (message LIKE 'RUN completed%' OR message LIKE 'RUN failed%')
    ORDER BY created_at DESC
    LIMIT 1
  `,
      )
      .get(taskId) as { message: string } | undefined;

    const reviewNotes = db
      .prepare(
        `
    SELECT raw_note
    FROM review_revision_history
    WHERE task_id = ?
    ORDER BY first_round DESC, id DESC
    LIMIT 6
  `,
      )
      .all(taskId) as Array<{ raw_note: string }>;

    const latestMeetingNotes = db
      .prepare(
        `
    SELECT e.speaker_name, e.content
    FROM meeting_minute_entries e
    JOIN meeting_minutes m ON m.id = e.meeting_id
    WHERE m.task_id = ?
      AND m.meeting_type = 'review'
    ORDER BY m.started_at DESC, m.created_at DESC, e.seq DESC
    LIMIT 4
  `,
      )
      .all(taskId) as Array<{ speaker_name: string; content: string }>;

    const unresolvedLines = reviewNotes
      .map((row) => row.raw_note.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 6);

    const meetingLines = latestMeetingNotes
      .map((row) => {
        const clipped = summarizeForMeetingBubble(row.content, 140);
        if (!clipped) return "";
        return `${row.speaker_name}: ${clipped}`;
      })
      .filter(Boolean)
      .reverse()
      .slice(0, 4);

    const memoBlock = extractLatestProjectMemoBlock(taskRow?.description ?? "", 900);
    const normalizedResult = normalizeStreamChunk(taskRow?.result ?? "", { dropCliNoise: true }).trim();
    const resultTail = normalizedResult.length > 900 ? `...${normalizedResult.slice(-900)}` : normalizedResult;

    const lines: string[] = [];
    if (latestRunSummary?.message) lines.push(`Last run: ${latestRunSummary.message}`);
    if (unresolvedLines.length > 0) {
      lines.push("Unresolved checklist:");
      lines.push(...unresolvedLines.map((line) => `- ${line}`));
    }
    if (meetingLines.length > 0) {
      lines.push("Latest review meeting highlights:");
      lines.push(...meetingLines.map((line) => `- ${line}`));
    }
    if (memoBlock) {
      lines.push("Latest project memo excerpt:");
      lines.push(memoBlock);
    }
    if (resultTail) {
      lines.push("Previous run output tail:");
      lines.push(resultTail);
    }
    if (lines.length === 0) return "";

    return `\n\n--- Continuation brief (same owner, same task) ---\n${lines.join("\n")}\n--- End continuation brief ---`;
  }

  return {
    getRecentConversationContext,
    extractLatestProjectMemoBlock,
    getTaskContinuationContext,
  };
}
