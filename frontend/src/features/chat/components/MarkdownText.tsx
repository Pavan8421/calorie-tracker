import type { ReactNode } from "react";

type ListItem = {
  text: string;
  notes: string[];
};

type Block =
  | { kind: "p"; text: string }
  | { kind: "ol"; items: ListItem[] }
  | { kind: "ul"; items: ListItem[] };

const BOLD = /\*\*([^*\n]+)\*\*|__([^_\n]+)__/g;

function inlineNodes(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = new RegExp(BOLD);
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    nodes.push(
      <strong key={`${keyPrefix}-b${index}`} className="font-bold">
        {match[1] ?? match[2]}
      </strong>,
    );
    cursor = match.index + match[0].length;
    index += 1;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  if (nodes.length === 0) nodes.push(text);
  return nodes;
}

function Inline({ text, id }: { text: string; id: string }) {
  return <>{inlineNodes(text, id)}</>;
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Extract<Block, { kind: "ol" | "ul" }> | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "p", text: paragraph.join("\n") });
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    blocks.push(list);
    list = null;
  }

  for (const line of lines) {
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = /^(\s*)[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (bullet[1].length >= 2 && list?.kind === "ol" && list.items.length > 0) {
        list.items[list.items.length - 1].notes.push(bullet[2]);
        continue;
      }
      flushParagraph();
      if (!list || list.kind !== "ul") {
        flushList();
        list = { kind: "ul", items: [] };
      }
      list.items.push({ text: bullet[2], notes: [] });
      continue;
    }

    const ordered = /^(\s*)\d+[.)]\s+(.*)$/.exec(line);
    if (ordered && ordered[1].length < 2) {
      flushParagraph();
      if (!list || list.kind !== "ol") {
        flushList();
        list = { kind: "ol", items: [] };
      }
      list.items.push({ text: ordered[2], notes: [] });
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function Lines({ text, id }: { text: string; id: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, index) => (
        <span key={`${id}-l${index}`}>
          {index > 0 ? <br /> : null}
          <Inline text={line} id={`${id}-l${index}`} />
        </span>
      ))}
    </>
  );
}

export function MarkdownText({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div className="space-y-2 break-words">
      {blocks.map((block, index) => {
        const id = `b${index}`;
        if (block.kind === "p") {
          return (
            <p key={id}>
              <Lines text={block.text} id={id} />
            </p>
          );
        }

        const ListTag = block.kind === "ol" ? "ol" : "ul";
        return (
          <ListTag
            key={id}
            className={
              block.kind === "ol"
                ? "list-decimal space-y-1.5 pl-5"
                : "list-disc space-y-1 pl-5"
            }
          >
            {block.items.map((item, itemIndex) => (
              <li key={`${id}-i${itemIndex}`}>
                <Inline text={item.text} id={`${id}-i${itemIndex}`} />
                {item.notes.length > 0 ? (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {item.notes.map((note, noteIndex) => (
                      <li key={`${id}-i${itemIndex}-n${noteIndex}`}>
                        <Inline text={note} id={`${id}-i${itemIndex}-n${noteIndex}`} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
