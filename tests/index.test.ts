import { describe, it, expect } from "vitest";
import { getTelegramEntities, getTelegramMarkdownV2 } from "../src/index";

describe("Markdown to Telegram - Entities", () => {
  it("converts basic bold and italic", () => {
    const md = "**Bold text** and *italic text*";
    const result = getTelegramEntities(md);
    
    expect(result.text).toBe("Bold text and italic text");
    expect(result.entities).toHaveLength(2);
    expect(result.entities[0]).toMatchObject({ type: "bold", offset: 0, length: 9 });
    expect(result.entities[1]).toMatchObject({ type: "italic", offset: 14, length: 11 });
  });

  it("handles unescaped characters gracefully", () => {
    const md = "Hello! Check out this: A+B=C; 1.2.3";
    const result = getTelegramEntities(md);
    // Entities don't care about escaping!
    expect(result.text).toBe("Hello! Check out this: A+B=C; 1.2.3");
    expect(result.entities).toHaveLength(0);
  });

  it("handles lists correctly by mutating to text", () => {
    const md = "- Item 1\n- Item **2**";
    const result = getTelegramEntities(md);
    expect(result.text).toBe("• Item 1\n\n• Item 2");
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0]).toMatchObject({ type: "bold", length: 1 });
  });

  it("handles strictly nested lists with indentation and checkboxes", () => {
    const md = `
#### **1. Daily Goals**
- **Morning**:
  - [x] Drink water 💧
  - [ ] Plan your day 📝
- **Afternoon**:
  - [ ] Focus on deep work
`;
    const result = getTelegramEntities(md);
    
    // Check line by line structure
    expect(result.text).toContain("• **Morning**:");
    expect(result.text).toContain("  ✅ Drink water 💧");
    expect(result.text).toContain("  ⬜ Plan your day 📝");
    expect(result.text).toContain("• **Afternoon**:");
    expect(result.text).toContain("  ⬜ Focus on deep work");
  });

  it("handles tables with monospace degradation", () => {
    const md = `
| Header 1 | Header 2 |
| -------- | -------- |
| Val 1    | Val 2    |
`;
    // Markdown-table plugin parses this
    const result = getTelegramEntities(md);
    // Should be wrapped in pre/code
    expect(result.entities).toContainEqual(expect.objectContaining({ type: "pre" }));
    // And contains the ASCII grid
    expect(result.text).toContain("| Header 1 | Header 2 |");
  });
});

describe("Markdown to Telegram - MarkdownV2", () => {
  it("escapes basic text", () => {
    const md = "Hello. This is **bold** and *italic*! 1+1=2";
    const result = getTelegramMarkdownV2(md);
    expect(result).toBe("Hello\\. This is *bold* and _italic_\\! 1\\+1\\=2");
  });

  it("handles complex code blocks without escaping inner contents improperly", () => {
    const md = "Here is some code:\n```typescript\nconst a = 1 + 1;\nconsole.log(a);\n```";
    const result = getTelegramMarkdownV2(md);
    expect(result).toBe("Here is some code:\n\n```typescript\nconst a = 1 + 1;\nconsole.log(a);\n```");
  });

  it("formats links safely", () => {
    const md = "Check [Google (Search)](https://google.com/)";
    const result = getTelegramMarkdownV2(md);
    // the URL parens shouldn't be escaped inside the markdown wrapper, wait
    // actually inside MarkdownV2 URL the ) must be escaped if we want to be safe, \).
    // Our logic escapes URLs. Text escaping escapes `(`.
    expect(result).toBe("Check [Google \\(Search\\)](https://google.com/)");
  });
});
