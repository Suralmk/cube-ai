"use client";

import React from "react";

const INLINE_PATTERNS: {
  re: RegExp;
  render: (match: RegExpExecArray, key: string) => React.ReactNode;
}[] = [
  {
    re: /`([^`]+)`/,
    render: (m, key) => (
      <code
        key={key}
        className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-[0.85em] dark:bg-white/15"
      >
        {m[1]}
      </code>
    ),
  },
  {
    re: /\[([^\]]+)\]\(([^)\s]+)\)/,
    render: (m, key) => (
      <a
        key={key}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline underline-offset-2 hover:opacity-80"
      >
        {parseInline(m[1])}
      </a>
    ),
  },
  {
    re: /\*\*([^*]+)\*\*/,
    render: (m, key) => <strong key={key}>{parseInline(m[1])}</strong>,
  },
  {
    re: /__([^_]+)__/,
    render: (m, key) => <strong key={key}>{parseInline(m[1])}</strong>,
  },
  {
    re: /\*([^*]+)\*/,
    render: (m, key) => <em key={key}>{parseInline(m[1])}</em>,
  },
  {
    re: /_([^_]+)_/,
    render: (m, key) => <em key={key}>{parseInline(m[1])}</em>,
  },
  {
    re: /~~([^~]+)~~/,
    render: (m, key) => <del key={key}>{parseInline(m[1])}</del>,
  },
];

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let rest = text;
  let counter = 0;
  let guard = 0;

  while (rest.length > 0 && guard++ < 2000) {
    let best: {
      index: number;
      length: number;
      render: (match: RegExpExecArray, key: string) => React.ReactNode;
      match: RegExpExecArray;
    } | null = null;

    for (const pattern of INLINE_PATTERNS) {
      const match = pattern.re.exec(rest);
      if (match && (best === null || match.index < best.index)) {
        best = {
          index: match.index,
          length: match[0].length,
          render: pattern.render,
          match,
        };
      }
    }

    if (!best) {
      nodes.push(rest);
      break;
    }

    if (best.index > 0) nodes.push(rest.slice(0, best.index));
    nodes.push(best.render(best.match, `i${counter++}`));
    rest = rest.slice(best.index + best.length);
  }

  return nodes;
}

type Align = "left" | "center" | "right";

type Block =
  | { type: "code"; lang: string; content: string }
  | { type: "heading"; level: number; content: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "table"; header: string[]; aligns: Align[]; rows: string[][] }
  | { type: "hr" }
  | { type: "p"; lines: string[] };

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.includes("-") &&
    trimmed.includes("|") &&
    /^\s*\|?[\s:|-]+\|?\s*$/.test(trimmed)
  );
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = /^```(.*)$/.exec(line.trim());
    if (fence) {
      const lang = fence[1].trim();
      const content: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        content.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: "code", lang, content: content.join("\n") });
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        content: heading[2].trim(),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // GFM table: header row followed by a separator row
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const header = splitRow(line);
      const aligns: Align[] = splitRow(lines[i + 1]).map((cell) => {
        const t = cell.trim();
        const left = t.startsWith(":");
        const right = t.endsWith(":");
        if (left && right) return "center";
        if (right) return "right";
        return "left";
      });
      i += 2;
      const rows: string[][] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        lines[i].includes("|")
      ) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", header, aligns, rows });
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", lines: quoteLines });
      continue;
    }

    // Paragraph (consume until blank line or next block starter)
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^```/.test(lines[i].trim()) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !(
        lines[i].includes("|") &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      )
    ) {
      paragraph.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", lines: paragraph });
  }

  return blocks;
}

const HEADING_CLASSES: Record<number, string> = {
  1: "text-3xl font-bold mt-6 mb-3 first:mt-0",
  2: "text-2xl font-bold mt-5 mb-3 first:mt-0",
  3: "text-xl font-semibold mt-4 mb-2 first:mt-0",
  4: "text-lg font-semibold mt-4 mb-2 first:mt-0",
  5: "text-base font-semibold mt-3 mb-1.5 first:mt-0",
  6: "text-base font-semibold mt-2 mb-1 first:mt-0",
};

function renderMultiline(lines: string[]): React.ReactNode {
  return lines.map((line, idx) => (
    <React.Fragment key={`l${idx}`}>
      {parseInline(line)}
      {idx < lines.length - 1 ? <br /> : null}
    </React.Fragment>
  ));
}

export function Markdown({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseBlocks(content);

  return (
    <div className={`text-[15px] leading-7 ${className}`}>
      {blocks.map((block, index) => {
        const key = `b${index}`;
        switch (block.type) {
          case "code":
            return (
              <pre
                key={key}
                className="my-2 overflow-x-auto rounded-lg bg-black/80 p-3 text-xs text-zinc-100 dark:bg-black/60"
              >
                <code className="font-mono">{block.content}</code>
              </pre>
            );
          case "heading": {
            const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements;
            return (
              <Tag key={key} className={HEADING_CLASSES[block.level]}>
                {parseInline(block.content)}
              </Tag>
            );
          }
          case "ul":
            return (
              <ul key={key} className="my-2 list-disc space-y-1 pl-5">
                {block.items.map((item, idx) => (
                  <li key={idx}>{parseInline(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="my-2 list-decimal space-y-1 pl-5">
                {block.items.map((item, idx) => (
                  <li key={idx}>{parseInline(item)}</li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote
                key={key}
                className="my-2 border-l-2 border-current/30 pl-3 italic opacity-90"
              >
                {renderMultiline(block.lines)}
              </blockquote>
            );
          case "table": {
            const alignClass = (a: Align) =>
              a === "center"
                ? "text-center"
                : a === "right"
                  ? "text-right"
                  : "text-left";
            return (
              <div
                key={key}
                className="my-4 overflow-x-auto rounded-xl border border-border bg-muted/40 shadow-sm"
              >
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted">
                      {block.header.map((cell, idx) => (
                        <th
                          key={idx}
                          className={`px-4 py-2.5 font-semibold text-foreground ${alignClass(
                            block.aligns[idx] ?? "left",
                          )}`}
                        >
                          {parseInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-t border-border/70 even:bg-muted/30"
                      >
                        {block.header.map((_, cIdx) => (
                          <td
                            key={cIdx}
                            className={`px-4 py-2.5 align-top ${alignClass(
                              block.aligns[cIdx] ?? "left",
                            )}`}
                          >
                            {parseInline(row[cIdx] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          case "hr":
            return <hr key={key} className="my-3 border-current/20" />;
          case "p":
            return (
              <p key={key} className="my-3 leading-7 first:mt-0 last:mb-0">
                {renderMultiline(block.lines)}
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
