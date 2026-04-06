import { visit } from "unist-util-visit";
import type { Root, Node, Parent, Text, Heading, List, ListItem, Paragraph, Table, TableRow, TableCell, Code, TableCell as MdTableCell } from "mdast";
import { toString } from "mdast-util-to-string";
import { parseMarkdown } from "../core/parser";

export function sanitizeMdast(tree: Root): Root {
  // Strip HTML nodes but recover inner raw Markdown content
  visit(tree, "html", (node: any, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      
      const rawText = node.value || "";
      const stripped = rawText.replace(/<[^>]*>?/gm, "").trim();
      
      if (stripped.length > 0) {
          // Parse the stripped text back into markdown nodes
          const parsedChildTree = parseMarkdown(stripped);
          parent.children.splice(index, 1, ...parsedChildTree.children);
          return index + parsedChildTree.children.length;
      } else {
          parent.children.splice(index, 1);
          return index; // continue at same index
      }
  });

  // Transform Headings into Bold text
  visit(tree, "heading", (node: Heading, index: number | undefined, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;
    
    // Convert children to strong, wrap in paragraph
    const paragraph: Paragraph = {
      type: "paragraph",
      children: [
        {
          type: "strong",
          children: node.children
        }
      ]
    };
    
    parent.children[index] = paragraph;
  });

  // Transform Lists into string bullet points
  visit(tree, "list", (node: List, index: number | undefined, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;
    
    const paragraphs: Paragraph[] = [];
    
    node.children.forEach((child, i) => {
      if (child.type === "listItem") {
        let prefix = node.ordered ? `${node.start! + i}. ` : "• ";
        if (child.checked !== null && child.checked !== undefined) {
             prefix = child.checked ? "✅ " : "⬜ ";
        }
        
        // Find the first paragraph in the listItem and insert the prefix
        visit(child, "paragraph", (pNode: Paragraph, pIdx, pParent) => {
          if (pIdx === 0) {
            pNode.children.unshift({ type: "text", value: prefix });
          }
        });
        
        // Flatten children to parent
        // A list item usually contains paragraphs. We can just pull them up.
        child.children.forEach(c => {
          if (c.type === "paragraph") {
            paragraphs.push(c);
          } else {
             // In case there's lists inside lists, recursive visitation handles it.
             // We can just dump the block.
             if (c.type !== "list") { // If it's a list, the child traversal will run into it later
               paragraphs.push({ type: "paragraph", children: [{ type: "text", value: toString(c) }] });
             } else {
                 paragraphs.push({ type: "paragraph", children: [{ type: "text", value: "  " + toString(c) }]}); // very basic nested indent for unparsed yet
                 // Realistically, to handle nested lists, we should keep track of depth, or transform bottom-up.
             }
          }
        });
      }
    });
    
    // Replace the list with a list of paragraphs. Because parent.children is an array, we splice.
    parent.children.splice(index, 1, ...paragraphs);
    // Returning index + paragraphs.length forces visit to skip the newly inserted nodes, preventing infinite loops.
    return index + paragraphs.length;
  });

  // Transform Tables into Code Blocks
  visit(tree, "table", (node: Table, index: number | undefined, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;
    
    // Degradation to monospace string.
    const tableText = formatTable(node);
    
    const codeNode: Code = {
      type: "code",
      lang: "", // no lang
      value: tableText
    };
    
      parent.children[index] = codeNode;
  });

  return tree;
}

function formatTable(table: Table): string {
    const rows = table.children;
    if (rows.length === 0) return "";

    const padStrs = rows.map(r => r.children.map(c => toString(c).trim()));
    const colCount = Math.max(...padStrs.map(r => r.length));
    const colWidths = new Array(colCount).fill(0);

    for (const r of padStrs) {
        for (let i = 0; i < r.length; i++) {
            colWidths[i] = Math.max(colWidths[i], r[i].length);
        }
    }

    let out = "";
    for (let rIdx = 0; rIdx < padStrs.length; rIdx++) {
        const row = padStrs[rIdx];
        const rowStr = row.map((cell, i) => cell.padEnd(colWidths[i])).join(" | ");
        out += `| ${rowStr} |\n`;

        // header sep
        if (rIdx === 0) {
            const sepStr = colWidths.map(w => "-".repeat(Math.max(w, 1))).join("-|-");
            out += `|-${sepStr}-|\n`;
        }
    }
    return out.trim();
}
