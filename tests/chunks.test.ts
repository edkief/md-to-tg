import { describe, it, expect } from "vitest";
import { getTelegramChunks, getTelegramEntities } from "../src/index";

describe("Markdown to Telegram - Chunks", () => {
  it("returns a single chunk when content fits", () => {
    const md = "**Bold** and *italic* text";
    const chunks = getTelegramChunks(md);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(getTelegramEntities(md));
  });

  it("splits long content into multiple chunks under the limit", () => {
    const paragraph = "This is a sentence with several words in it.";
    const md = Array.from({ length: 50 }, () => paragraph).join("\n\n");
    const chunks = getTelegramChunks(md, 200);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(200);
    }
  });

  it("prefers paragraph boundaries when splitting", () => {
    const md = ["First paragraph here.", "Second paragraph here.", "Third paragraph here."].join("\n\n");
    const chunks = getTelegramChunks(md, 30);

    // Each chunk should end cleanly on a paragraph, not mid-sentence.
    for (const chunk of chunks) {
      expect(chunk.text.trim().length).toBeGreaterThan(0);
      expect(chunk.text).not.toMatch(/\s$/); // trimmed
    }
    // Reassembled content preserves every paragraph.
    const joined = chunks.map(c => c.text).join("\n\n");
    expect(joined).toContain("First paragraph here.");
    expect(joined).toContain("Second paragraph here.");
    expect(joined).toContain("Third paragraph here.");
  });

  it("rebases entity offsets into each chunk", () => {
    const md = ["Plain intro paragraph text.", "Tail with **bold word** here."].join("\n\n");
    const chunks = getTelegramChunks(md, 30);

    for (const { text, entities } of chunks) {
      for (const e of entities) {
        expect(e.offset).toBeGreaterThanOrEqual(0);
        expect(e.offset + e.length).toBeLessThanOrEqual(text.length);
      }
    }

    // The bold entity should land on "bold word" in whichever chunk holds it.
    const boldChunk = chunks.find(c => c.entities.some(e => e.type === "bold"));
    expect(boldChunk).toBeDefined();
    const bold = boldChunk!.entities.find(e => e.type === "bold")!;
    expect(boldChunk!.text.slice(bold.offset, bold.offset + bold.length)).toBe("bold word");
  });

  it("avoids splitting through an entity when there is room before it", () => {
    const md = "intro text goes here\n\n**unbreakable bold span stays whole**";
    const chunks = getTelegramChunks(md, 40);

    // The bold span (35 chars) fits under 40, so it must appear intact in one chunk.
    const boldChunk = chunks.find(c => c.entities.some(e => e.type === "bold"))!;
    const bold = boldChunk.entities.find(e => e.type === "bold")!;
    expect(boldChunk.text.slice(bold.offset, bold.offset + bold.length)).toBe(
      "unbreakable bold span stays whole"
    );
  });

  it("divides an oversized table pre block across chunks", () => {
    const header = "| A | B |\n| - | - |\n";
    const rows = Array.from({ length: 300 }, (_, i) => `| row${i} | val${i} |`).join("\n");
    const md = `# Report\n\n${header}${rows}`;

    const full = getTelegramEntities(md);
    expect(full.text.length).toBeGreaterThan(4096);

    const chunks = getTelegramChunks(md);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(4096);
      // Entities stay within bounds after the forced split.
      for (const e of chunk.entities) {
        expect(e.offset).toBeGreaterThanOrEqual(0);
        expect(e.offset + e.length).toBeLessThanOrEqual(chunk.text.length);
      }
    }
  });

  it("preserves SMP emoji as 2 UTF-16 units in offsets across chunks", () => {
    const md = "lead in paragraph one\n\nmusic note 🎵 then **bold** tail";
    const chunks = getTelegramChunks(md, 28);

    const boldChunk = chunks.find(c => c.entities.some(e => e.type === "bold"))!;
    const bold = boldChunk.entities.find(e => e.type === "bold")!;
    expect(boldChunk.text.slice(bold.offset, bold.offset + bold.length)).toBe("bold");
  });
});
