# md-to-tg

A strict, robust, AST-based Markdown to Telegram format converter perfectly suited for parsing **LLM-generated** (frequently messy) Markdown. 

Standard markdown libraries usually employ regex mechanisms causing extreme string matching headaches when it comes to the highly strict requirements of **Telegram's `MarkdownV2`**. If you miss just one formatting constraint, the Telegram API throws a rigid `400 Bad Request` error. 

To circumvent this entirely, this library operates on an **Abstract Syntax Tree (AST)** pipeline to process logic sequentially, enabling safe and absolute control over parsing constraints and producing native, format-escaping-free **Telegram MessageEntities** (UTF-16 boundaries).

## Scope & Features

* **Context-Aware AST Resolution**: Uses `remark` under the hood. Avoids overlapping element parsing and completely strips out unsupported formats or transforms them into logical parallels.
* **Frictionless Fallbacks (Tables & Lists)**:
  * Natively transforms Markdown tables (`| ... |`) into tightly restricted ASCII code blocks for simple Telegram viewing.
  * Correctly wraps Lists and Checkboxes (`- [ ]`) natively to emojis matching the respective values since Telegram doesn't support unbulleted `<ul>` logic. 
* **Seamless HTML Unwrapping**: Many LLM formatting paradigms return blockquotes containing `<details>` and `<summary>` components. Since Telegram strictly ignores these (and forces escaping strings inside them), `md-to-tg` aggressively processes the raw internal Markdown text nested *inside and outside* HTML wrappers, discarding elements safely!
* **Native Message Entities Generation**: Completely shields developers from the absolute chaos that is MarkdownV2 escaping and directly emits formatted arrays mapping to valid code bounds over plain text, meaning **you'll never experience an API breakdown over broken URL syntax lengths.**

## Installation

```bash
npm install md-to-tg
# or
pnpm add md-to-tg
# or
yarn add md-to-tg
```

## Usage

### 1. Generating Entities (Highly Recommended)
By extracting `MessageEntity` properties correctly mapped across index constraints via `getTelegramEntities(md)`, you can completely neglect explicit `parse_mode` settings while sending.

```typescript
import { Bot } from "grammy";
import { getTelegramEntities } from "md-to-tg";

const bot = new Bot("YOUR_BOT_TOKEN");
const llmGeneratedMarkdown = "**Bold Title:** This is an *example*!";

// Parse formatting constraints without producing a MarkdownV2 string
const { text, entities } = getTelegramEntities(llmGeneratedMarkdown);

// Dispatch API call directly without setting parse_mode!
bot.api.sendMessage(chatId, text, {
  entities: entities as any // Format bounds map natively 1:1 on the Telegram Bot API schema!
});
```

### 2. Generating Simple MarkdownV2 String
For developers strictly restricted to consuming raw standard outputs formatted by generic APIs, you can invoke the stringifier logic directly.

```typescript
import { getTelegramMarkdownV2 } from "md-to-tg";

const llmGeneratedMarkdown = `Here is a variable: a+b=c, but this is **Bold**!`;

const formattedText = getTelegramMarkdownV2(llmGeneratedMarkdown);
console.log(formattedText);
// Returns correctly escaped Telegram characters:
// "Here is a variable: a\\+b\\=c, but this is *Bold*\\!"
```

## Edge Cases

- **Blockquotes**: Supported. Wraps interior formatting directly into parsed structures logic. 
- **Nested Constraints**: Resolves perfectly using the recursive parsing tree traversal. 

## Testing 

You can run automated parsing constraints against a live Grammy mock using:
```bash
TELEGRAM_TOKEN="<token>" TELEGRAM_CHAT_ID="<id>" pnpm test
```
