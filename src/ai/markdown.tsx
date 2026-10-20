import {React} from "mailspring-exports";

// Small, safe Markdown renderer for model output. Builds React elements directly
// (no innerHTML), so nothing the model returns can inject markup or scripts.
// Supports: headings, bullet / numbered lists, paragraphs, ``` code blocks, ---,
// **bold**, *italic*, `code`, [links](https://…). Common HTML tags the model may
// emit (<b>, <strong>, <i>, <em>, <br>, <p>, <li>, <h1-6>) are mapped to Markdown first.

type Block =
    | { kind: "heading"; level: number; text: string }
    | { kind: "list"; ordered: boolean; items: string[] }
    | { kind: "code"; text: string }
    | { kind: "rule" }
    | { kind: "paragraph"; lines: string[] };

export function renderMarkdown(source: string): React.ReactNode {
    return parseBlocks(htmlToMarkdown(source)).map(renderBlock);
}

function htmlToMarkdown(text: string) {
    return text
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?(strong|b)>/gi, "**")
        .replace(/<\/?(em|i)>/gi, "*")
        .replace(/<\/?code>/gi, "`")
        .replace(/<h([1-6])[^>]*>/gi, (_m, level) => `\n${"#".repeat(Number(level))} `)
        .replace(/<li[^>]*>/gi, "\n- ")
        .replace(/<\/(p|div|h[1-6]|ul|ol|li)>/gi, "\n")
        .replace(/<(p|div|ul|ol)[^>]*>/gi, "\n")
        // drop any other tags
        .replace(/<\/?[a-z][^>]*>/gi, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
}

const BULLET = /^\s*[-*+•]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;

function parseBlocks(text: string): Block[] {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    const blocks: Block[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) {
            i++;
            continue;
        }

        if (line.trim().startsWith("```")) {
            const code: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                code.push(lines[i++]);
            }
            i++; // closing fence
            blocks.push({kind: "code", text: code.join("\n")});
            continue;
        }

        const heading = HEADING.exec(line);
        if (heading) {
            blocks.push({kind: "heading", level: heading[1].length, text: heading[2]});
            i++;
            continue;
        }

        if (RULE.test(line)) {
            blocks.push({kind: "rule"});
            i++;
            continue;
        }

        const listPattern = BULLET.test(line) ? BULLET : ORDERED.test(line) ? ORDERED : null;
        if (listPattern) {
            const items: string[] = [];
            while (i < lines.length && listPattern.test(lines[i])) {
                items.push(listPattern.exec(lines[i])[1]);
                i++;
                // indented continuation lines belong to the previous item
                while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !BULLET.test(lines[i]) && !ORDERED.test(lines[i])) {
                    items[items.length - 1] += ` ${lines[i].trim()}`;
                    i++;
                }
            }
            blocks.push({kind: "list", ordered: listPattern === ORDERED, items});
            continue;
        }

        const paragraph: string[] = [];
        while (
            i < lines.length && lines[i].trim() &&
            !HEADING.test(lines[i]) && !BULLET.test(lines[i]) && !ORDERED.test(lines[i]) &&
            !RULE.test(lines[i]) && !lines[i].trim().startsWith("```")
            ) {
            paragraph.push(lines[i++]);
        }
        blocks.push({kind: "paragraph", lines: paragraph});
    }

    return blocks;
}

function renderBlock(block: Block, key: number): React.ReactNode {
    switch (block.kind) {
        case "heading": {
            // keep headings small: this is a popover, not a document
            const Tag = (block.level <= 2 ? "h4" : "h5") as any;
            return <Tag key={key}>{renderInline(block.text)}</Tag>;
        }
        case "list": {
            const Tag = (block.ordered ? "ol" : "ul") as any;
            return <Tag key={key}>{block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</Tag>;
        }
        case "code":
            return <pre key={key}><code>{block.text}</code></pre>;
        case "rule":
            return <hr key={key}/>;
        default:
            return (
                <p key={key}>
                    {block.lines.map((line, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <br/>}
                            {renderInline(line)}
                        </React.Fragment>
                    ))}
                </p>
            );
    }
}

// order matters: code first (its content is literal), then bold before italic
const INLINE = new RegExp([
    "`([^`]+)`",                                   // 1 code
    "\\*\\*(.+?)\\*\\*|__(.+?)__",                 // 2,3 bold
    "\\*([^*\\s](?:[^*]*?[^*\\s])?)\\*",           // 4 italic *x*
    "(?<![\\w])_([^_\\s](?:[^_]*?[^_\\s])?)_(?![\\w])", // 5 italic _x_ (not snake_case)
    "\\[([^\\]]+)\\]\\(((?:[^()\\s]|\\([^()\\s]*\\))+)\\)", // 6,7 link (allows one level of parens in the url)
].join("|"), "g");

function renderInline(text: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    let last = 0;
    let key = 0;
    let match: RegExpExecArray | null;

    INLINE.lastIndex = 0;
    while ((match = INLINE.exec(text)) !== null) {
        if (match.index > last) {
            nodes.push(text.slice(last, match.index));
        }

        const [, code, bold1, bold2, italic1, italic2, linkText, linkUrl] = match;
        // recursion below resets the shared regex, so remember where we are
        const end = match.index + match[0].length;

        if (code !== undefined) {
            nodes.push(<code key={key++}>{code}</code>);
        } else if (bold1 !== undefined || bold2 !== undefined) {
            nodes.push(<strong key={key++}>{renderInline(bold1 ?? bold2)}</strong>);
        } else if (italic1 !== undefined || italic2 !== undefined) {
            nodes.push(<em key={key++}>{renderInline(italic1 ?? italic2)}</em>);
        } else if (linkText !== undefined) {
            nodes.push(renderLink(linkText, linkUrl, key++));
        }

        last = end;
        INLINE.lastIndex = end;
    }

    if (last < text.length) {
        nodes.push(text.slice(last));
    }
    return nodes;
}

function renderLink(text: string, url: string, key: number) {
    // only open safe schemes, and always in the system browser
    if (!/^(https?:|mailto:)/i.test(url)) {
        return <React.Fragment key={key}>{text}</React.Fragment>;
    }
    const open = (event: React.MouseEvent) => {
        event.preventDefault();
        require("electron").shell.openExternal(url);
    };
    return <a key={key} href={url} title={url} onClick={open}>{renderInline(text)}</a>;
}
