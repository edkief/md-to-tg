import { describe, it, expect } from "vitest";
import { getTelegramEntities } from "../src/index";
import { Bot, Context } from "grammy";
import * as dotenv from "dotenv";

dotenv.config();

const complexMarkdown = `
---
Here’s another **creatively formatted Markdown message** for you, this time with a fun and playful theme:

---

### 🎉 **Markdown Message: The Fun and Games Edition** 🎉

---

#### **1. Welcome to the Game Show!**
- **Host**: 🤖 *Markdown Bot*
- **Theme**: *Trivia, Puzzles, and Fun Facts*

---

#### **2. Trivia Question (with Answer)**
**Question**: What is the capital of France?
- <details>
  <summary>Click to reveal the answer!</summary>
  **Answer**: It's **Paris**! 🇫🇷
</details>

---

#### **3. Puzzle Time**
Solve this riddle:
> I speak without a mouth and hear without ears.
> I have no body, but I come alive with wind.
> What am I?
>
> <details>
>   <summary>Reveal the answer!</summary>
>   **Answer**: An **echo**! 🔊
> </details>

---

#### **4. Fun Facts Table**
| Fact Type      | Description                          | Example                          |
|----------------|--------------------------------------|----------------------------------|
| **Animal**     | The fastest land animal              | **Cheetah** (70 mph) 🐆         |
| **Space**      | The hottest planet in our solar system | **Venus** (462°C) 🪐         |
| **Tech**       | The first computer programmer        | **Ada Lovelace** 💻            |

---

#### **5. Emoji Story**
Create a story using only emojis:
👩🍳 → 🍝 → 🍴 → 👍 → 🎉
*(A chef cooks pasta, serves it, gets a thumbs-up, and celebrates!)*

---

#### **6. Interactive Task List**
- [ ] Solve the riddle
- [ ] Learn a fun fact
- [ ] Share this with a friend

---

#### **7. Blockquote for Inspiration**
> "Play is the highest form of research."
> — *Albert Einstein*

---
`;

describe("Grammy Validation - Complex Markdown", () => {
  it("Parses complex markdown into entities accurately without throwing", () => {
    const result = getTelegramEntities(complexMarkdown);

    // Basic assertions
    // The HTML should be mostly stripped out or ignored
    expect(result.text).not.toContain("<details>");
    expect(result.text).not.toContain("</details>");
    
    // Checkboxes should have been converted
    expect(result.text).toContain("⬜ Solve the riddle");
    
    // Tables converted to code blocks
    expect(result.entities.some(e => e.type === "pre")).toBe(true);
    expect(result.text).toContain("| Animal");
    
    // Test passes if it didn't throw
  });

  // Skips if TELEGRAM_TOKEN or TELEGRAM_CHAT_ID are not set
  it.skipIf(!process.env.TELEGRAM_TOKEN || !process.env.TELEGRAM_CHAT_ID)("Sends message to Telegram via Grammy without formatting errors", async () => {
    const bot = new Bot(process.env.TELEGRAM_TOKEN!);
    const chatId = process.env.TELEGRAM_CHAT_ID!;
    
    const result = getTelegramEntities(complexMarkdown);
    
    try {
        await bot.api.sendMessage(chatId, result.text, {
            entities: result.entities as any // GramJS Entity vs Telegram Bot API entity type mapping is mostly identical
        });
        expect(true).toBe(true);
    } catch (e) {
        console.error("Telegram API Error:", e);
        throw e;
    }
  });
});
