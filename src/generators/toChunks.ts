import type { EntityOutput, MessageEntity } from "./toEntities";

export const TELEGRAM_MAX_LENGTH = 4096;

/**
 * Splits an already-converted {@link EntityOutput} into one or more sub-chunks
 * that each fit within `maxLength` UTF-16 code units (Telegram's `sendMessage`
 * limit is 4096).
 *
 * The plain text is walked and split at the latest acceptable boundary inside
 * each window, preferring a paragraph break (`\n\n`), then a line break (`\n`),
 * then a space, and finally a hard cut when no separator is available. Entities
 * are sliced to the portion overlapping each chunk and their offsets rebased to
 * the chunk. Where possible the split point is moved to just before an entity
 * that would otherwise straddle the boundary, so formatting (bold, links, table
 * `pre` blocks, ...) stays intact. An entity larger than `maxLength` on its own
 * is unavoidably divided across chunks.
 *
 * When the text already fits, the input is returned as a single chunk with zero
 * additional work.
 */
export function splitIntoChunks(
  { text, entities }: EntityOutput,
  maxLength: number = TELEGRAM_MAX_LENGTH
): EntityOutput[] {
  if (maxLength <= 0 || text.length <= maxLength) {
    return [{ text, entities }];
  }

  const chunks: EntityOutput[] = [];
  let start = 0;

  while (start < text.length) {
    const end = findChunkEnd(text, entities, start, maxLength);

    const raw = text.slice(start, end);
    const trimmed = raw.trimEnd();

    if (trimmed.length > 0) {
      chunks.push({
        text: trimmed,
        entities: sliceEntities(entities, start, end, trimmed.length),
      });
    }

    start = end;
  }

  // Defensive: never return an empty array (e.g. all-whitespace input).
  return chunks.length > 0 ? chunks : [{ text, entities }];
}

/** Determine the exclusive end offset for the chunk beginning at `start`. */
function findChunkEnd(
  text: string,
  entities: MessageEntity[],
  start: number,
  maxLength: number
): number {
  if (text.length - start <= maxLength) {
    return text.length;
  }

  const hardEnd = start + maxLength;
  let end = preferredBreak(text, start, hardEnd);
  end = avoidEntityStraddle(entities, start, end);

  // No progress possible without breaking an entity that spans the whole
  // window — fall back to a hard cut (the entity is divided across chunks).
  if (end <= start) {
    end = hardEnd;
  }

  return end;
}

/**
 * Find the latest separator boundary within `(start, hardEnd]`, breaking just
 * after the separator. Falls back to a hard cut at `hardEnd`.
 */
function preferredBreak(text: string, start: number, hardEnd: number): number {
  const window = text.slice(start, hardEnd);

  const para = window.lastIndexOf("\n\n");
  if (para > 0) return start + para + 2;

  const line = window.lastIndexOf("\n");
  if (line > 0) return start + line + 1;

  const space = window.lastIndexOf(" ");
  if (space > 0) return start + space + 1;

  return hardEnd;
}

/**
 * Move `end` down to the start of the earliest entity that would straddle it,
 * so we break before that entity rather than through it. Entities that begin at
 * or before `start` are left to be divided (they cannot fit otherwise).
 */
function avoidEntityStraddle(
  entities: MessageEntity[],
  start: number,
  end: number
): number {
  let adjusted = end;
  let changed = true;

  while (changed) {
    changed = false;
    for (const e of entities) {
      const eEnd = e.offset + e.length;
      if (e.offset > start && e.offset < adjusted && eEnd > adjusted) {
        adjusted = e.offset;
        changed = true;
      }
    }
  }

  return adjusted;
}

/**
 * Slice entities to the part overlapping `[start, end)`, rebasing offsets to the
 * chunk and clamping lengths to `chunkLength` (the trimmed chunk text length).
 */
function sliceEntities(
  entities: MessageEntity[],
  start: number,
  end: number,
  chunkLength: number
): MessageEntity[] {
  const result: MessageEntity[] = [];

  for (const e of entities) {
    const overlapStart = Math.max(e.offset, start);
    const overlapEnd = Math.min(e.offset + e.length, end);

    const offset = overlapStart - start;
    const length = Math.min(overlapEnd, start + chunkLength) - overlapStart;

    if (length > 0 && offset < chunkLength) {
      result.push({ ...e, offset, length });
    }
  }

  return result;
}
