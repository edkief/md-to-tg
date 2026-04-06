import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";

export function parseMarkdown(markdown: string): Root {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm);

  // We only parse, we don't compile to HTML.
  return processor.parse(markdown) as Root;
}
