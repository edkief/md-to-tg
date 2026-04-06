export * from "./core/parser";
export * from "./transformers/sanitize";
export * from "./generators/toEntities";
export * from "./generators/toMarkdownV2";

import { parseMarkdown } from "./core/parser";
import { sanitizeMdast } from "./transformers/sanitize";
import { generateEntities, EntityOutput } from "./generators/toEntities";
import { generateMarkdownV2 } from "./generators/toMarkdownV2";

export function getTelegramEntities(markdown: string): EntityOutput {
  const ast = parseMarkdown(markdown);
  const sanitized = sanitizeMdast(ast);
  return generateEntities(sanitized);
}

export function getTelegramMarkdownV2(markdown: string): string {
  const ast = parseMarkdown(markdown);
  const sanitized = sanitizeMdast(ast);
  return generateMarkdownV2(sanitized);
}

