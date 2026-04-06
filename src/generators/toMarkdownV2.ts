import type { Root, Node, Text, Code, InlineCode, Strong, Emphasis, Delete, Link, Paragraph, Parent } from "mdast";

// Escapes special characters for normal Telegram MarkdownV2 text
function escapeText(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// Escapes for inside Code blocks
function escapeCode(text: string): string {
  return text.replace(/([`\\])/g, "\\$1");
}

// Escapes URLs inside [Text](URL)
function escapeUrl(text: string): string {
  return text.replace(/([)\\])/g, "\\$1");
}

export function generateMarkdownV2(tree: Root): string {
  let output = "";

  function append(text: string) {
    output += text;
  }

  function walk(node: Node) {
    switch (node.type) {
      case "root":
        walkChildren(node as Parent);
        break;

      case "paragraph":
        walkChildren(node as Parent);
        append("\n\n");
        break;

      case "text":
        append(escapeText((node as Text).value));
        break;

      case "inlineCode":
        append(`\`${escapeCode((node as InlineCode).value)}\``);
        break;

      case "code":
        const codeNode = node as Code;
        const lang = codeNode.lang ? escapeText(codeNode.lang) : "";
        append(`\`\`\`${lang}\n${escapeCode(codeNode.value)}\n\`\`\`\n\n`);
        break;

      case "strong":
        append("*");
        walkChildren(node as Parent);
        append("*");
        break;

      case "emphasis":
        append("_");
        walkChildren(node as Parent);
        append("_");
        break;

      case "delete":
        append("~");
        walkChildren(node as Parent);
        append("~");
        break;

      case "link":
        const linkNode = node as Link;
        append("[");
        walkChildren(node as Parent);
        append(`](${escapeUrl(linkNode.url)})`);
        break;
        
      case "blockquote":
        append(">"); // To be fully correct blockquotes should prepend > to each line, but simple text wrapping works often if short
        // actually wait, MarkdownV2 blockquote `>` prefix must be applied to all lines inside.
        // Easiest is to capture children output, then prepend `>`
        const beforeLen = output.length;
        walkChildren(node as Parent);
        const childOut = output.substring(beforeLen);
        output = output.substring(0, beforeLen); // restore
        // prepend >
        append(childOut.split("\n").map(l => "> " + l).join("\n"));
        append("\n\n");
        break;

      case "break":
        append("\n");
        break;

      default:
        // Ignore unhandled nodes
        if ("children" in node) {
          walkChildren(node as Parent);
        }
        break;
    }
  }

  function walkChildren(parent: Parent) {
    if (parent.children) {
      parent.children.forEach(child => walk(child));
    }
  }

  walk(tree);

  return output.trimEnd();
}
