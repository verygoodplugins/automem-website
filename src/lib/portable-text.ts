/**
 * Render emdash Portable Text blocks to HTML.
 * Lightweight renderer — covers the block types our seed script produces.
 */

interface PTSpan {
  _type: "span";
  text: string;
  marks?: string[];
}

interface PTBlock {
  _type: string;
  _key?: string;
  style?: string;
  children?: PTSpan[];
  markDefs?: any[];
  listItem?: string;
  level?: number;
  code?: string;
  language?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSpan(span: PTSpan): string {
  let text = escapeHtml(span.text);
  if (!span.marks?.length) return text;

  for (const mark of span.marks) {
    if (mark === "strong") text = `<strong>${text}</strong>`;
    else if (mark === "em") text = `<em>${text}</em>`;
    else if (mark === "code") text = `<code>${text}</code>`;
    else if (mark === "underline") text = `<u>${text}</u>`;
    else if (mark === "strikethrough") text = `<s>${text}</s>`;
    else if (mark.startsWith("link:")) {
      const href = escapeHtml(mark.slice(5));
      text = `<a href="${href}">${text}</a>`;
    }
  }
  return text;
}

function renderChildren(children?: PTSpan[]): string {
  if (!children) return "";
  return children.map(renderSpan).join("");
}

export function renderPortableText(blocks: PTBlock[]): string {
  const parts: string[] = [];
  let inList: string | null = null;

  for (const block of blocks) {
    // Close list if we're leaving one
    if (inList && (!block.listItem || block.listItem !== inList)) {
      parts.push(inList === "bullet" ? "</ul>" : "</ol>");
      inList = null;
    }

    // Code block
    if (block._type === "code") {
      const lang = block.language ? ` class="language-${escapeHtml(block.language)}"` : "";
      parts.push(`<pre><code${lang}>${escapeHtml(block.code || "")}</code></pre>`);
      continue;
    }

    // Line break / HR
    if (block._type === "break") {
      parts.push("<hr>");
      continue;
    }

    // Regular block
    if (block._type === "block") {
      const content = renderChildren(block.children);

      // List item
      if (block.listItem) {
        if (inList !== block.listItem) {
          inList = block.listItem;
          parts.push(inList === "bullet" ? "<ul>" : "<ol>");
        }
        parts.push(`<li>${content}</li>`);
        continue;
      }

      // Styled blocks
      switch (block.style) {
        case "h1":
          parts.push(`<h1>${content}</h1>`);
          break;
        case "h2":
          parts.push(`<h2>${content}</h2>`);
          break;
        case "h3":
          parts.push(`<h3>${content}</h3>`);
          break;
        case "h4":
          parts.push(`<h4>${content}</h4>`);
          break;
        case "blockquote":
          parts.push(`<blockquote>${content}</blockquote>`);
          break;
        default:
          parts.push(`<p>${content}</p>`);
      }
    }
  }

  // Close any trailing list
  if (inList) {
    parts.push(inList === "bullet" ? "</ul>" : "</ol>");
  }

  return parts.join("\n");
}
