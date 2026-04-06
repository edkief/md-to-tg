import type { Root, Node, Text, Code, InlineCode, Strong, Emphasis, Delete, Link, Paragraph, PhrasingContent, Parent } from "mdast";

export interface MessageEntity {
  type: "bold" | "italic" | "strikethrough" | "underline" | "code" | "pre" | "text_link" | "spoiler" | "blockquote";
  offset: number;
  length: number;
  url?: string;
  language?: string;
}

export interface EntityOutput {
  text: string;
  entities: MessageEntity[];
}

export function generateEntities(tree: Root): EntityOutput {
  const entities: MessageEntity[] = [];
  let currentText = "";

  function appendText(text: string) {
    currentText += text;
  }

  function walk(node: Node) {
    switch (node.type) {
      case "root":
        // Fallthrough to walk children
        walkChildren(node as Parent);
        break;

      case "paragraph":
        walkChildren(node as Parent);
        appendText("\n\n");
        break;

      case "text":
        appendText((node as Text).value);
        break;

      case "inlineCode":
        const icodeStart = currentText.length;
        appendText((node as InlineCode).value);
        entities.push({
          type: "code",
          offset: icodeStart,
          length: currentText.length - icodeStart,
        });
        break;

      case "code":
        const codeNode = node as Code;
        const codeStart = currentText.length;
        appendText(codeNode.value);
        appendText("\n\n");
        entities.push({
          type: "pre",
          offset: codeStart,
          length: codeNode.value.length,
          language: codeNode.lang || undefined,
        });
        break;

      case "strong":
        const strongStart = currentText.length;
        walkChildren(node as Parent);
        entities.push({
          type: "bold",
          offset: strongStart,
          length: currentText.length - strongStart,
        });
        break;

      case "emphasis":
        const emStart = currentText.length;
        walkChildren(node as Parent);
        entities.push({
          type: "italic",
          offset: emStart,
          length: currentText.length - emStart,
        });
        break;

      case "delete":
        const delStart = currentText.length;
        walkChildren(node as Parent);
        entities.push({
          type: "strikethrough",
          offset: delStart,
          length: currentText.length - delStart,
        });
        break;

      case "link":
        const linkNode = node as Link;
        const linkStart = currentText.length;
        walkChildren(node as Parent);
        entities.push({
          type: "text_link",
          offset: linkStart,
          length: currentText.length - linkStart,
          url: linkNode.url,
        });
        break;

      case "blockquote":
        const bqStart = currentText.length;
        walkChildren(node as Parent);
        entities.push({
          type: "blockquote",
          offset: bqStart,
          length: currentText.length - bqStart,
        });
        appendText("\n\n");
        break;

      case "break":
        appendText("\n");
        break;

      default:
        // Ignore unhandled nodes but traverse children if it has any
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

  // Start walking
  walk(tree);

  // We trim right since paragraphs and codes add extra \n\n
  const finalTrimmed = currentText.trimEnd();

  // Fix up entities that might extend beyond trimmed length
  const finalEntities = entities.filter(e => e.offset < finalTrimmed.length)
    .map(e => {
        if (e.offset + e.length > finalTrimmed.length) {
            return { ...e, length: finalTrimmed.length - e.offset };
        }
        return e;
    });

  return { text: finalTrimmed, entities: finalEntities };
}
