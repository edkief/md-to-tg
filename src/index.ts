export * from "./core/parser";
export * from "./transformers/sanitize";
export * from "./generators/toEntities";
export * from "./generators/toMarkdownV2";
export * from "./generators/toChunks";

import { parseMarkdown } from "./core/parser";
import { sanitizeMdast } from "./transformers/sanitize";
import { generateEntities, EntityOutput } from "./generators/toEntities";
import { generateMarkdownV2 } from "./generators/toMarkdownV2";
import { splitIntoChunks, TELEGRAM_MAX_LENGTH } from "./generators/toChunks";

export function getTelegramEntities(markdown: string): EntityOutput {
  const ast = parseMarkdown(markdown);
  const sanitized = sanitizeMdast(ast);
  return generateEntities(sanitized);
}

/**
 * Convert markdown to one or more Telegram-ready chunks, each guaranteed to fit
 * within `maxLength` UTF-16 code units (default 4096, Telegram's `sendMessage`
 * limit). Short content returns a single chunk identical to
 * {@link getTelegramEntities}.
 */
export function getTelegramChunks(
  markdown: string,
  maxLength: number = TELEGRAM_MAX_LENGTH
): EntityOutput[] {
  return splitIntoChunks(getTelegramEntities(markdown), maxLength);
}

export function getTelegramMarkdownV2(markdown: string): string {
  const ast = parseMarkdown(markdown);
  const sanitized = sanitizeMdast(ast);
  return generateMarkdownV2(sanitized);
}

