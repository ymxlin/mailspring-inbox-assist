/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/ai/ai-settings.ts"
/*!*******************************!*\
  !*** ./src/ai/ai-settings.ts ***!
  \*******************************/
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.aiConfig = aiConfig;
exports.getApiKey = getApiKey;
exports.setApiKey = setApiKey;
exports.llmSettings = llmSettings;
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
const config_keys_1 = __webpack_require__(/*! ../config-keys */ "./src/config-keys.ts");
const providers_1 = __webpack_require__(/*! ./providers */ "./src/ai/providers.ts");
function aiConfig() {
    const get = (key, fallback) => {
        const value = AppEnv.config.get(key);
        return value === undefined || value === null || value === "" ? fallback : value;
    };
    return {
        provider: get(config_keys_1.CONFIG_KEYS.AI_PROVIDER, providers_1.DEFAULT_PROVIDER.id),
        baseUrl: get(config_keys_1.CONFIG_KEYS.AI_BASE_URL, providers_1.DEFAULT_PROVIDER.baseUrl),
        model: get(config_keys_1.CONFIG_KEYS.AI_MODEL, providers_1.DEFAULT_PROVIDER.model),
        systemPrompt: get(config_keys_1.CONFIG_KEYS.AI_SYSTEM_PROMPT, providers_1.DEFAULT_SYSTEM_PROMPT),
        maxChars: Number(get(config_keys_1.CONFIG_KEYS.AI_MAX_CHARS, providers_1.DEFAULT_MAX_CHARS)) || providers_1.DEFAULT_MAX_CHARS,
    };
}
async function getApiKey() {
    try {
        return (await mailspring_exports_1.KeyManager.getPassword(config_keys_1.API_KEY_SECRET_NAME)) || "";
    }
    catch (e) {
        return "";
    }
}
async function setApiKey(value) {
    if (value) {
        await mailspring_exports_1.KeyManager.replacePassword(config_keys_1.API_KEY_SECRET_NAME, value);
    }
    else {
        await mailspring_exports_1.KeyManager.deletePassword(config_keys_1.API_KEY_SECRET_NAME);
    }
}
async function llmSettings() {
    const config = aiConfig();
    return { baseUrl: config.baseUrl, model: config.model, apiKey: await getApiKey() };
}


/***/ },

/***/ "./src/ai/llm-client.ts"
/*!******************************!*\
  !*** ./src/ai/llm-client.ts ***!
  \******************************/
(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.chatCompletion = chatCompletion;
const http = __importStar(__webpack_require__(/*! http */ "http"));
const https = __importStar(__webpack_require__(/*! https */ "https"));
const TIMEOUT_MS = 120000;
// Calls an OpenAI-compatible /chat/completions endpoint.
// Uses Node's http(s) instead of fetch so local servers and APIs without CORS headers work.
function chatCompletion(settings, messages) {
    if (!settings.baseUrl) {
        return Promise.reject(new Error("No base URL configured (Preferences → Inbox Assist)."));
    }
    if (!settings.model) {
        return Promise.reject(new Error("No model configured (Preferences → Inbox Assist)."));
    }
    let url;
    try {
        url = new URL(`${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`);
    }
    catch (e) {
        return Promise.reject(new Error(`Invalid base URL: ${settings.baseUrl}`));
    }
    const body = JSON.stringify({
        model: settings.model,
        messages,
        temperature: 0.2,
        stream: false,
    });
    const headers = {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
    };
    if (settings.apiKey) {
        headers.Authorization = `Bearer ${settings.apiKey}`;
    }
    const transport = url.protocol === "http:" ? http : https;
    return new Promise((resolve, reject) => {
        const req = transport.request(url, { method: "POST", headers, timeout: TIMEOUT_MS }, (res) => {
            let data = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                var _a, _b, _c, _d;
                if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`HTTP ${res.statusCode}: ${errorMessage(data)}`));
                    return;
                }
                try {
                    const content = (_d = (_c = (_b = (_a = JSON.parse(data)) === null || _a === void 0 ? void 0 : _a.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content;
                    if (typeof content !== "string" || !content.trim()) {
                        reject(new Error("The model returned an empty response."));
                        return;
                    }
                    resolve(stripReasoning(content));
                }
                catch (e) {
                    reject(new Error(`Unexpected response: ${data.slice(0, 200)}`));
                }
            });
        });
        req.on("timeout", () => req.destroy(new Error(`Request timed out after ${TIMEOUT_MS / 1000}s`)));
        req.on("error", (err) => {
            reject(err.code === "ECONNREFUSED"
                ? new Error(`Cannot connect to ${url.host}. Is the server running?`)
                : err);
        });
        req.write(body);
        req.end();
    });
}
function errorMessage(data) {
    var _a;
    try {
        const json = JSON.parse(data);
        return ((_a = json === null || json === void 0 ? void 0 : json.error) === null || _a === void 0 ? void 0 : _a.message) || (json === null || json === void 0 ? void 0 : json.message) || data.slice(0, 200);
    }
    catch (e) {
        return data.slice(0, 200) || "no response body";
    }
}
// reasoning models (DeepSeek-R1, Qwen3, ...) may inline their chain of thought
function stripReasoning(text) {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}


/***/ },

/***/ "./src/ai/markdown.tsx"
/*!*****************************!*\
  !*** ./src/ai/markdown.tsx ***!
  \*****************************/
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.renderMarkdown = renderMarkdown;
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
function renderMarkdown(source) {
    return parseBlocks(htmlToMarkdown(source)).map(renderBlock);
}
function htmlToMarkdown(text) {
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
function parseBlocks(text) {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) {
            i++;
            continue;
        }
        if (line.trim().startsWith("```")) {
            const code = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                code.push(lines[i++]);
            }
            i++; // closing fence
            blocks.push({ kind: "code", text: code.join("\n") });
            continue;
        }
        const heading = HEADING.exec(line);
        if (heading) {
            blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
            i++;
            continue;
        }
        if (RULE.test(line)) {
            blocks.push({ kind: "rule" });
            i++;
            continue;
        }
        const listPattern = BULLET.test(line) ? BULLET : ORDERED.test(line) ? ORDERED : null;
        if (listPattern) {
            const items = [];
            while (i < lines.length && listPattern.test(lines[i])) {
                items.push(listPattern.exec(lines[i])[1]);
                i++;
                // indented continuation lines belong to the previous item
                while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !BULLET.test(lines[i]) && !ORDERED.test(lines[i])) {
                    items[items.length - 1] += ` ${lines[i].trim()}`;
                    i++;
                }
            }
            blocks.push({ kind: "list", ordered: listPattern === ORDERED, items });
            continue;
        }
        const paragraph = [];
        while (i < lines.length && lines[i].trim() &&
            !HEADING.test(lines[i]) && !BULLET.test(lines[i]) && !ORDERED.test(lines[i]) &&
            !RULE.test(lines[i]) && !lines[i].trim().startsWith("```")) {
            paragraph.push(lines[i++]);
        }
        blocks.push({ kind: "paragraph", lines: paragraph });
    }
    return blocks;
}
function renderBlock(block, key) {
    switch (block.kind) {
        case "heading": {
            // keep headings small: this is a popover, not a document
            const Tag = (block.level <= 2 ? "h4" : "h5");
            return mailspring_exports_1.React.createElement(Tag, { key: key }, renderInline(block.text));
        }
        case "list": {
            const Tag = (block.ordered ? "ol" : "ul");
            return mailspring_exports_1.React.createElement(Tag, { key: key }, block.items.map((item, i) => mailspring_exports_1.React.createElement("li", { key: i }, renderInline(item))));
        }
        case "code":
            return mailspring_exports_1.React.createElement("pre", { key: key },
                mailspring_exports_1.React.createElement("code", null, block.text));
        case "rule":
            return mailspring_exports_1.React.createElement("hr", { key: key });
        default:
            return (mailspring_exports_1.React.createElement("p", { key: key }, block.lines.map((line, i) => (mailspring_exports_1.React.createElement(mailspring_exports_1.React.Fragment, { key: i },
                i > 0 && mailspring_exports_1.React.createElement("br", null),
                renderInline(line))))));
    }
}
// order matters: code first (its content is literal), then bold before italic
const INLINE = new RegExp([
    "`([^`]+)`", // 1 code
    "\\*\\*(.+?)\\*\\*|__(.+?)__", // 2,3 bold
    "\\*([^*\\s](?:[^*]*?[^*\\s])?)\\*", // 4 italic *x*
    "(?<![\\w])_([^_\\s](?:[^_]*?[^_\\s])?)_(?![\\w])", // 5 italic _x_ (not snake_case)
    "\\[([^\\]]+)\\]\\(((?:[^()\\s]|\\([^()\\s]*\\))+)\\)", // 6,7 link (allows one level of parens in the url)
].join("|"), "g");
function renderInline(text) {
    const nodes = [];
    let last = 0;
    let key = 0;
    let match;
    INLINE.lastIndex = 0;
    while ((match = INLINE.exec(text)) !== null) {
        if (match.index > last) {
            nodes.push(text.slice(last, match.index));
        }
        const [, code, bold1, bold2, italic1, italic2, linkText, linkUrl] = match;
        // recursion below resets the shared regex, so remember where we are
        const end = match.index + match[0].length;
        if (code !== undefined) {
            nodes.push(mailspring_exports_1.React.createElement("code", { key: key++ }, code));
        }
        else if (bold1 !== undefined || bold2 !== undefined) {
            nodes.push(mailspring_exports_1.React.createElement("strong", { key: key++ }, renderInline(bold1 !== null && bold1 !== void 0 ? bold1 : bold2)));
        }
        else if (italic1 !== undefined || italic2 !== undefined) {
            nodes.push(mailspring_exports_1.React.createElement("em", { key: key++ }, renderInline(italic1 !== null && italic1 !== void 0 ? italic1 : italic2)));
        }
        else if (linkText !== undefined) {
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
function renderLink(text, url, key) {
    // only open safe schemes, and always in the system browser
    if (!/^(https?:|mailto:)/i.test(url)) {
        return mailspring_exports_1.React.createElement(mailspring_exports_1.React.Fragment, { key: key }, text);
    }
    const open = (event) => {
        event.preventDefault();
        (__webpack_require__(/*! electron */ "electron").shell).openExternal(url);
    };
    return mailspring_exports_1.React.createElement("a", { key: key, href: url, title: url, onClick: open }, renderInline(text));
}


/***/ },

/***/ "./src/ai/providers.ts"
/*!*****************************!*\
  !*** ./src/ai/providers.ts ***!
  \*****************************/
(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DEFAULT_MAX_CHARS = exports.DEFAULT_SYSTEM_PROMPT = exports.DEFAULT_PROVIDER = exports.PROVIDERS = void 0;
exports.providerById = providerById;
exports.PROVIDERS = [
    // international / cloud
    { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", needsKey: true },
    { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", needsKey: true },
    // mainland China
    { id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", needsKey: true },
    { id: "qwen", label: "Qwen (DashScope)", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus", needsKey: true },
    { id: "moonshot", label: "Moonshot / Kimi", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k", needsKey: true },
    { id: "zhipu", label: "Zhipu GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash", needsKey: true },
    // local, on this machine
    { id: "ollama", label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", model: "llama3.1", needsKey: false },
    { id: "lmstudio", label: "LM Studio (local)", baseUrl: "http://localhost:1234/v1", model: "local-model", needsKey: false },
    { id: "custom", label: "Custom", baseUrl: "", model: "", needsKey: false },
];
exports.DEFAULT_PROVIDER = exports.PROVIDERS.find((p) => p.id === "ollama");
exports.DEFAULT_SYSTEM_PROMPT = [
    "You summarize email threads for a busy reader.",
    "Reply with: a one-line TL;DR, then 3-5 bullet key points,",
    "then any action items, questions or deadlines for the reader (or \"None\").",
    "Write in the same language as the email. Be concise; do not invent facts.",
].join(" ");
exports.DEFAULT_MAX_CHARS = 12000;
function providerById(id) {
    return exports.PROVIDERS.find((p) => p.id === id);
}


/***/ },

/***/ "./src/ai/summarize-button.tsx"
/*!*************************************!*\
  !*** ./src/ai/summarize-button.tsx ***!
  \*************************************/
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
const summary_popover_1 = __importDefault(__webpack_require__(/*! ./summary-popover */ "./src/ai/summary-popover.tsx"));
// Registered with the message-list thread-actions role, so it renders in the same
// button group as Archive / Trash / Star for the open thread.
class SummarizeButton extends mailspring_exports_1.React.Component {
    constructor() {
        super(...arguments);
        this._onClick = (event) => {
            const threadId = this._threadId();
            if (!threadId) {
                return;
            }
            const originRect = event.currentTarget.getBoundingClientRect();
            mailspring_exports_1.Actions.openPopover(mailspring_exports_1.React.createElement(summary_popover_1.default, { threadId: threadId }), { originRect, direction: "down" });
        };
    }
    _threadId() {
        var _a;
        const { items = [], thread } = this.props;
        return items.length === 1 ? (_a = (thread || items[0])) === null || _a === void 0 ? void 0 : _a.id : null;
    }
    render() {
        // summarizing several selected threads at once isn't supported
        if (!this._threadId()) {
            return null;
        }
        return (mailspring_exports_1.React.createElement("button", { className: "btn btn-toolbar inbox-assist-summarize", title: "Summarize this email with AI", onClick: this._onClick }, "\u2728 Summarize"));
    }
}
SummarizeButton.displayName = "InboxAssistSummarizeButton";
exports["default"] = SummarizeButton;


/***/ },

/***/ "./src/ai/summarize.ts"
/*!*****************************!*\
  !*** ./src/ai/summarize.ts ***!
  \*****************************/
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.summarizeThread = summarizeThread;
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
const ai_settings_1 = __webpack_require__(/*! ./ai-settings */ "./src/ai/ai-settings.ts");
const llm_client_1 = __webpack_require__(/*! ./llm-client */ "./src/ai/llm-client.ts");
const summary_cache_1 = __webpack_require__(/*! ./summary-cache */ "./src/ai/summary-cache.ts");
const cache = new summary_cache_1.SummaryCache();
// Summarizes a thread by id, or the thread open in the message list when no id is given.
// Messages are loaded from the database (with bodies) so this works for threads that
// aren't open, e.g. from the thread list's right-click menu.
// The last few summaries are cached; `force` (Retry) skips the cache.
async function summarizeThread(threadId = mailspring_exports_1.MessageStore.threadId(), { force = false } = {}) {
    if (!threadId) {
        throw new Error("No email is open.");
    }
    const thread = await mailspring_exports_1.DatabaseStore.find(mailspring_exports_1.Thread, threadId);
    const messages = (await mailspring_exports_1.DatabaseStore.findAll(mailspring_exports_1.Message, { threadId })
        .include(mailspring_exports_1.Message.attributes.body)
        .order(mailspring_exports_1.Message.attributes.date.ascending()))
        .filter((m) => !m.draft);
    if (!thread || messages.length === 0) {
        throw new Error("Couldn't load this email.");
    }
    const config = (0, ai_settings_1.aiConfig)();
    // a new message, or different model / endpoint / prompt / length, invalidates the entry
    const last = messages[messages.length - 1];
    const fingerprint = [
        messages.length, last.id, last.version,
        config.baseUrl, config.model, config.systemPrompt, config.maxChars,
    ].join("\u0000");
    if (!force) {
        const hit = cache.get(threadId, fingerprint);
        if (hit) {
            return Object.assign(Object.assign({}, hit), { cached: true });
        }
    }
    const { text, truncated } = threadToText(thread, messages, config.maxChars);
    const settings = await (0, ai_settings_1.llmSettings)();
    const summary = await (0, llm_client_1.chatCompletion)(settings, [
        { role: "system", content: config.systemPrompt },
        { role: "user", content: text },
    ]);
    const result = { summary, model: settings.model, truncated };
    cache.set(threadId, fingerprint, result);
    return result;
}
function threadToText(thread, messages, maxChars) {
    const parts = messages.map((m, idx) => {
        const from = (m.from || []).map(formatContact).join(", ");
        const to = (m.to || []).map(formatContact).join(", ");
        const date = m.date ? new Date(m.date).toLocaleString() : "";
        const body = messageBodyText(m);
        return [
            `--- Message ${idx + 1} of ${messages.length} ---`,
            `From: ${from}`,
            to ? `To: ${to}` : null,
            date ? `Date: ${date}` : null,
            "",
            body,
        ].filter((line) => line !== null).join("\n");
    });
    const header = `Subject: ${thread.subject || "(no subject)"}\n\n`;
    let body = parts.join("\n\n");
    let truncated = false;
    // keep the subject and the end of the thread: the latest messages matter most
    if (body.length > maxChars) {
        body = `[earlier part of the thread omitted]\n…${body.slice(body.length - maxChars)}`;
        truncated = true;
    }
    return { text: header + body, truncated };
}
function formatContact(contact) {
    if (!contact) {
        return "";
    }
    return contact.name && contact.name !== contact.email
        ? `${contact.name} <${contact.email}>`
        : contact.email;
}
function messageBodyText(message) {
    const body = message.body;
    if (!body) {
        return message.snippet || "";
    }
    if (message.plaintext) {
        return body.trim();
    }
    let html = body;
    try {
        html = mailspring_exports_1.QuotedHTMLTransformer.removeQuotedHTML(body, { keepIfWholeBodyIsQuote: true });
    }
    catch (e) {
        // fall back to the full body
    }
    return htmlToText(html);
}
function htmlToText(html) {
    var _a;
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, head, title").forEach((el) => el.remove());
    doc.querySelectorAll("br").forEach((el) => el.replaceWith("\n"));
    doc.querySelectorAll("p, div, li, tr, h1, h2, h3, h4, h5, h6, blockquote, table")
        .forEach((el) => el.append("\n"));
    return (((_a = doc.body) === null || _a === void 0 ? void 0 : _a.textContent) || "")
        .replace(/[ \t ]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}


/***/ },

/***/ "./src/ai/summary-cache.ts"
/*!*********************************!*\
  !*** ./src/ai/summary-cache.ts ***!
  \*********************************/
(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SummaryCache = void 0;
// In-memory cache of the most recent summaries, one entry per thread.
// Kept in memory only (cleared on restart / reload) so email summaries never touch disk.
const MAX_ENTRIES = 3;
class SummaryCache {
    constructor() {
        // Map keeps insertion order: first key = least recently used
        this._entries = new Map();
    }
    get(threadId, fingerprint) {
        const entry = this._entries.get(threadId);
        if (!entry || entry.fingerprint !== fingerprint) {
            return null;
        }
        // refresh recency
        this._entries.delete(threadId);
        this._entries.set(threadId, entry);
        return entry.value;
    }
    set(threadId, fingerprint, value) {
        this._entries.delete(threadId);
        this._entries.set(threadId, { fingerprint, value });
        while (this._entries.size > MAX_ENTRIES) {
            this._entries.delete(this._entries.keys().next().value);
        }
    }
}
exports.SummaryCache = SummaryCache;


/***/ },

/***/ "./src/ai/summary-popover.tsx"
/*!************************************!*\
  !*** ./src/ai/summary-popover.tsx ***!
  \************************************/
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
const summarize_1 = __webpack_require__(/*! ./summarize */ "./src/ai/summarize.ts");
const markdown_1 = __webpack_require__(/*! ./markdown */ "./src/ai/markdown.tsx");
class SummaryPopover extends mailspring_exports_1.React.Component {
    constructor() {
        super(...arguments);
        this._mounted = false;
        this.state = { loading: true, result: null, error: null, copied: false };
        this._onKeyDown = (event) => {
            if (event.key === "Escape") {
                this._close();
            }
        };
        this._close = () => {
            mailspring_exports_1.Actions.closePopover();
        };
        this._retry = () => this._run({ force: true });
        this._run = async ({ force = false } = {}) => {
            this.setState({ loading: true, result: null, error: null, copied: false });
            try {
                const result = await (0, summarize_1.summarizeThread)(this.props.threadId, { force });
                if (this._mounted) {
                    this.setState({ loading: false, result });
                }
            }
            catch (err) {
                if (this._mounted) {
                    this.setState({ loading: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
                }
            }
        };
        this._copy = () => {
            const { result } = this.state;
            if (!result) {
                return;
            }
            // Mailspring's renderer code reaches the clipboard through @electron/remote
            __webpack_require__(/*! @electron/remote */ "@electron/remote").clipboard.writeText(result.summary);
            this.setState({ copied: true });
        };
        this._openPreferences = () => {
            mailspring_exports_1.Actions.closePopover();
            mailspring_exports_1.Actions.switchPreferencesTab("InboxAssist");
            mailspring_exports_1.Actions.openPreferences();
        };
    }
    componentDidMount() {
        this._mounted = true;
        document.addEventListener("keydown", this._onKeyDown);
        this._run();
    }
    componentWillUnmount() {
        this._mounted = false;
        document.removeEventListener("keydown", this._onKeyDown);
    }
    render() {
        const { loading, result, error, copied } = this.state;
        return (
        // focusable root: Mailspring's popover focuses the first [tabIndex] element on open
        // and closes itself when focus leaves it (click outside, or switching apps)
        mailspring_exports_1.React.createElement("div", { className: "inbox-assist-summary", tabIndex: -1 },
            mailspring_exports_1.React.createElement("div", { className: "inbox-assist-summary-header" }, "Summary"),
            loading && mailspring_exports_1.React.createElement("div", { className: "inbox-assist-summary-status" }, "Summarizing\u2026"),
            error && (mailspring_exports_1.React.createElement("div", { className: "inbox-assist-summary-error" },
                error,
                mailspring_exports_1.React.createElement("div", null,
                    mailspring_exports_1.React.createElement("a", { onClick: this._openPreferences }, "Open Inbox Assist preferences")))),
            result && (mailspring_exports_1.React.createElement("div", { className: "inbox-assist-summary-body" },
                (0, markdown_1.renderMarkdown)(result.summary),
                mailspring_exports_1.React.createElement("div", { className: "inbox-assist-summary-meta" },
                    result.model,
                    result.cached ? " · cached, Retry to regenerate" : "",
                    result.truncated ? " · long thread, only the latest part was sent" : ""))),
            mailspring_exports_1.React.createElement("div", { className: "inbox-assist-summary-actions" },
                result && mailspring_exports_1.React.createElement("button", { className: "btn", onClick: this._copy }, copied ? "Copied" : "Copy"),
                !loading && mailspring_exports_1.React.createElement("button", { className: "btn", onClick: this._retry }, "Retry"),
                mailspring_exports_1.React.createElement("button", { className: "btn", onClick: this._close }, "Close"))));
    }
}
SummaryPopover.displayName = "InboxAssistSummaryPopover";
exports["default"] = SummaryPopover;


/***/ },

/***/ "./src/ai/thread-context-menu.ts"
/*!***************************************!*\
  !*** ./src/ai/thread-context-menu.ts ***!
  \***************************************/
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ThreadContextMenuFeature = void 0;
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
const summary_popover_1 = __importDefault(__webpack_require__(/*! ./summary-popover */ "./src/ai/summary-popover.tsx"));
const PATCHED = "__inboxAssistSummarizePatched";
const MODULE_NAME = /[\\/]thread-list-context-menu\.(js|ts)$/;
// Adds "Summarize with AI" to the thread list's right-click menu.
// Mailspring doesn't export that menu, so this finds the already-loaded module in Node's
// require cache (webpack's own `require` would only see this bundle) and wraps
// menuItemTemplate() on its prototype.
class ThreadContextMenuFeature {
    constructor() {
        this._proto = null;
        this._original = null;
        this._lastClick = { x: 0, y: 0 };
        this._onContextMenu = (event) => {
            this._lastClick = { x: event.clientX, y: event.clientY };
        };
    }
    enable() {
        // remember where the menu was opened, to anchor the popover there
        document.addEventListener("contextmenu", this._onContextMenu, true);
        const MenuClass = findMenuClass();
        if (!MenuClass) {
            console.warn("[mailspring-inbox-assist] thread list context menu not found; right-click item disabled");
            return;
        }
        const proto = MenuClass.prototype;
        if (proto.menuItemTemplate[PATCHED]) {
            return;
        }
        const feature = this;
        const original = proto.menuItemTemplate;
        proto.menuItemTemplate = function menuItemTemplateWithSummary(...args) {
            return original.apply(this, args).then((items) => {
                if (!this.threadIds || this.threadIds.length !== 1) {
                    return items;
                }
                const threadId = this.threadIds[0];
                return [
                    { label: "✨ Summarize with AI", click: () => feature.openSummary(threadId) },
                    { type: "separator" },
                    ...items,
                ];
            });
        };
        proto.menuItemTemplate[PATCHED] = true;
        this._proto = proto;
        this._original = original;
    }
    disable() {
        document.removeEventListener("contextmenu", this._onContextMenu, true);
        if (this._proto && this._original) {
            this._proto.menuItemTemplate = this._original;
        }
        this._proto = null;
        this._original = null;
    }
    openSummary(threadId) {
        const { x, y } = this._lastClick;
        const originRect = { left: x, top: y, right: x + 1, bottom: y + 1, width: 1, height: 1 };
        mailspring_exports_1.Actions.openPopover(mailspring_exports_1.React.createElement(summary_popover_1.default, { threadId }), {
            originRect,
            direction: "right",
            fallbackDirection: "down",
        });
    }
}
exports.ThreadContextMenuFeature = ThreadContextMenuFeature;
function findMenuClass() {
    const cache = require.cache || {};
    const key = Object.keys(cache).find((k) => MODULE_NAME.test(k));
    const exported = key && cache[key].exports;
    const MenuClass = exported && (exported.default || exported);
    return MenuClass && MenuClass.prototype && typeof MenuClass.prototype.menuItemTemplate === "function"
        ? MenuClass
        : null;
}


/***/ },

/***/ "./src/config-keys.ts"
/*!****************************!*\
  !*** ./src/config-keys.ts ***!
  \****************************/
(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.API_KEY_SECRET_NAME = exports.LIST_KEYS = exports.CONFIG_KEYS = void 0;
exports.scrollToLatestEnabled = scrollToLatestEnabled;
exports.threadCountEnabled = threadCountEnabled;
exports.threadFilter = threadFilter;
const PREFIX = "mailspring-inbox-assist";
exports.CONFIG_KEYS = {
    // "all" | "unread" | "starred"
    THREAD_FILTER: `${PREFIX}.threadFilter`,
    // open threads scrolled to the latest message (on unless turned off)
    SCROLL_TO_LATEST: `${PREFIX}.scrollToLatest`,
    // message-count badge on conversations in the thread list (on unless turned off)
    THREAD_COUNT: `${PREFIX}.threadCountBadge`,
    AI_PROVIDER: `${PREFIX}.ai.provider`,
    AI_BASE_URL: `${PREFIX}.ai.baseUrl`,
    AI_MODEL: `${PREFIX}.ai.model`,
    AI_SYSTEM_PROMPT: `${PREFIX}.ai.systemPrompt`,
    AI_MAX_CHARS: `${PREFIX}.ai.maxChars`,
};
// keys that change which threads are listed, so the thread list must refresh
exports.LIST_KEYS = [exports.CONFIG_KEYS.THREAD_FILTER, exports.CONFIG_KEYS.THREAD_COUNT];
// stored in the OS keychain via KeyManager, never in config.json
exports.API_KEY_SECRET_NAME = `${PREFIX}.ai.apiKey`;
// defaults to on: only an explicit `false` turns it off
function scrollToLatestEnabled() {
    return AppEnv.config.get(exports.CONFIG_KEYS.SCROLL_TO_LATEST) !== false;
}
function threadCountEnabled() {
    return AppEnv.config.get(exports.CONFIG_KEYS.THREAD_COUNT) !== false;
}
function threadFilter() {
    const value = AppEnv.config.get(exports.CONFIG_KEYS.THREAD_FILTER);
    return value === "unread" || value === "starred" ? value : "all";
}


/***/ },

/***/ "./src/filter-select.tsx"
/*!*******************************!*\
  !*** ./src/filter-select.tsx ***!
  \*******************************/
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
const mailspring_component_kit_1 = __webpack_require__(/*! mailspring-component-kit */ "mailspring-component-kit");
const config_keys_1 = __webpack_require__(/*! ./config-keys */ "./src/config-keys.ts");
const OPTIONS = [
    { value: "all", label: "All mail", icon: "inbox.png" },
    { value: "unread", label: "Unread only", icon: "unread.png" },
    { value: "starred", label: "Starred only", icon: "starred.png" },
];
// Toolbar dropdown: All / Unread only / Starred only (mutually exclusive).
// Built on Mailspring's ButtonDropdown + Menu so it follows the active theme.
class FilterSelect extends mailspring_exports_1.React.Component {
    constructor() {
        super(...arguments);
        this._disposer = null;
        this.state = { value: (0, config_keys_1.threadFilter)() };
        this._onSelect = (option) => {
            AppEnv.config.set(config_keys_1.CONFIG_KEYS.THREAD_FILTER, option.value);
        };
        this._renderOption = (option) => (mailspring_exports_1.React.createElement("span", { className: "inbox-assist-filter-option" },
            mailspring_exports_1.React.createElement(mailspring_component_kit_1.RetinaImg, { name: option.icon, mode: mailspring_component_kit_1.RetinaImg.Mode.ContentIsMask }),
            mailspring_exports_1.React.createElement("span", null, option.label)));
    }
    componentDidMount() {
        this._disposer = AppEnv.config.observe(config_keys_1.CONFIG_KEYS.THREAD_FILTER, () => {
            this.setState({ value: (0, config_keys_1.threadFilter)() });
        });
    }
    componentWillUnmount() {
        var _a, _b;
        (_b = (_a = this._disposer) === null || _a === void 0 ? void 0 : _a.dispose) === null || _b === void 0 ? void 0 : _b.call(_a);
        this._disposer = null;
    }
    render() {
        const { value } = this.state;
        const current = OPTIONS.find((o) => o.value === value) || OPTIONS[0];
        return (mailspring_exports_1.React.createElement(mailspring_component_kit_1.ButtonDropdown, { className: `inbox-assist-filter ${value !== "all" ? "active" : ""}`, style: { order: 101 }, primaryTitle: `Thread filter: ${current.label}`, primaryItem: this._renderOption(current), closeOnMenuClick: true, attachment: "right", menu: mailspring_exports_1.React.createElement(mailspring_component_kit_1.Menu, { items: OPTIONS, itemKey: (o) => o.value, itemChecked: (o) => o.value === value, itemContent: this._renderOption, onSelect: this._onSelect }) }));
    }
}
FilterSelect.displayName = "InboxAssistFilterSelect";
exports["default"] = FilterSelect;


/***/ },

/***/ "./src/main.ts"
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
const config_keys_1 = __webpack_require__(/*! ./config-keys */ "./src/config-keys.ts");
const thread_list_refresh_1 = __webpack_require__(/*! ./thread-list-refresh */ "./src/thread-list-refresh.ts");
const thread_filters_feature_1 = __webpack_require__(/*! ./thread-filters-feature */ "./src/thread-filters-feature.ts");
const filter_select_1 = __importDefault(__webpack_require__(/*! ./filter-select */ "./src/filter-select.tsx"));
const summarize_button_1 = __importDefault(__webpack_require__(/*! ./ai/summarize-button */ "./src/ai/summarize-button.tsx"));
const thread_context_menu_1 = __webpack_require__(/*! ./ai/thread-context-menu */ "./src/ai/thread-context-menu.ts");
const preferences_tab_1 = __importDefault(__webpack_require__(/*! ./preferences-tab */ "./src/preferences-tab.tsx"));
const scroll_to_latest_1 = __importDefault(__webpack_require__(/*! ./scroll-to-latest */ "./src/scroll-to-latest.tsx"));
const thread_count_badge_1 = __webpack_require__(/*! ./thread-count-badge */ "./src/thread-count-badge.tsx");
const threadFilters = new thread_filters_feature_1.ThreadFiltersFeature();
const threadContextMenu = new thread_context_menu_1.ThreadContextMenuFeature();
const threadCountBadge = new thread_count_badge_1.ThreadCountBadgeFeature();
// Registered by location: rendered inside that toolbar column's div.item-container.
// Registered by role: rendered inside Mailspring's thread-actions button group
// (Archive / Trash / Star) in the message view.
// MessageListHeaders components render inside the reading pane's scroll region.
const COMPONENTS = [
    [filter_select_1.default, { location: mailspring_exports_1.WorkspaceStore.Location.ThreadList.Toolbar }],
    [summarize_button_1.default, { role: "MessageList:ThreadActionsToolbarButton" }],
    [scroll_to_latest_1.default, { role: "MessageListHeaders" }],
];
const preferencesTab = new mailspring_exports_1.PreferencesUIStore.TabItem({
    tabId: "InboxAssist",
    displayName: "Inbox Assist",
    componentClassFn: () => preferences_tab_1.default,
    order: 100,
});
let _disposers = [];
function activate() {
    threadFilters.enable();
    threadContextMenu.enable();
    threadCountBadge.enable();
    for (const [component, options] of COMPONENTS) {
        mailspring_exports_1.ComponentRegistry.register(component, options);
    }
    mailspring_exports_1.PreferencesUIStore.registerPreferencesTab(preferencesTab);
    // observe() fires immediately too; the refresh guard collapses those into one refresh
    _disposers = config_keys_1.LIST_KEYS.map((key) => AppEnv.config.observe(key, () => (0, thread_list_refresh_1.refreshThreadList)()));
    console.log("[mailspring-inbox-assist] initialized");
}
function deactivate() {
    var _a;
    for (const disposer of _disposers) {
        (_a = disposer === null || disposer === void 0 ? void 0 : disposer.dispose) === null || _a === void 0 ? void 0 : _a.call(disposer);
    }
    _disposers = [];
    for (const [component] of COMPONENTS) {
        mailspring_exports_1.ComponentRegistry.unregister(component);
    }
    mailspring_exports_1.PreferencesUIStore.unregisterPreferencesTab(preferencesTab.tabId);
    threadContextMenu.disable();
    threadCountBadge.disable();
    threadFilters.disable();
    (0, thread_list_refresh_1.refreshThreadList)();
}


/***/ },

/***/ "./src/preferences-tab.tsx"
/*!*********************************!*\
  !*** ./src/preferences-tab.tsx ***!
  \*********************************/
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
const config_keys_1 = __webpack_require__(/*! ./config-keys */ "./src/config-keys.ts");
const ai_settings_1 = __webpack_require__(/*! ./ai/ai-settings */ "./src/ai/ai-settings.ts");
const llm_client_1 = __webpack_require__(/*! ./ai/llm-client */ "./src/ai/llm-client.ts");
const providers_1 = __webpack_require__(/*! ./ai/providers */ "./src/ai/providers.ts");
class InboxAssistPreferences extends mailspring_exports_1.React.Component {
    constructor(props) {
        super(props);
        this._toggle = (stateKey, configKey) => (event) => {
            const value = event.target.checked;
            AppEnv.config.set(configKey, value);
            this.setState({ [stateKey]: value });
        };
        this._set = (stateKey, configKey) => (event) => {
            const value = event.target.value;
            this.setState({ [stateKey]: value });
            AppEnv.config.set(configKey, value);
        };
        this._onProviderChange = (event) => {
            const preset = (0, providers_1.providerById)(event.target.value);
            if (!preset) {
                return;
            }
            AppEnv.config.set(config_keys_1.CONFIG_KEYS.AI_PROVIDER, preset.id);
            if (preset.id === "custom") {
                this.setState({ provider: preset.id });
                return;
            }
            AppEnv.config.set(config_keys_1.CONFIG_KEYS.AI_BASE_URL, preset.baseUrl);
            AppEnv.config.set(config_keys_1.CONFIG_KEYS.AI_MODEL, preset.model);
            this.setState({ provider: preset.id, baseUrl: preset.baseUrl, model: preset.model });
        };
        // also runs on blur: Test connection uses the typed key, summaries use the saved one,
        // so an unsaved key would pass the test and then fail later
        this._saveKey = async () => {
            if (this.state.keySaved) {
                return;
            }
            await (0, ai_settings_1.setApiKey)(this.state.apiKey.trim());
            this.setState({ keySaved: true });
        };
        this._test = async () => {
            this.setState({ testStatus: "Testing…" });
            const { baseUrl, model, apiKey } = this.state;
            try {
                const reply = await (0, llm_client_1.chatCompletion)({ baseUrl, model, apiKey: apiKey.trim() }, [
                    { role: "user", content: "Reply with the single word: OK" },
                ]);
                this.setState({ testStatus: `✓ Connected. Model replied: ${reply.slice(0, 80)}` });
            }
            catch (err) {
                this.setState({ testStatus: `✗ ${(err === null || err === void 0 ? void 0 : err.message) || err}` });
            }
        };
        this._resetPrompt = () => {
            AppEnv.config.set(config_keys_1.CONFIG_KEYS.AI_SYSTEM_PROMPT, providers_1.DEFAULT_SYSTEM_PROMPT);
            this.setState({ systemPrompt: providers_1.DEFAULT_SYSTEM_PROMPT });
        };
        this.state = Object.assign(Object.assign({}, (0, ai_settings_1.aiConfig)()), { apiKey: "", keySaved: false, testStatus: "", scrollToLatest: (0, config_keys_1.scrollToLatestEnabled)(), threadCount: (0, config_keys_1.threadCountEnabled)() });
    }
    async componentDidMount() {
        const apiKey = await (0, ai_settings_1.getApiKey)();
        this.setState({ apiKey, keySaved: true });
    }
    render() {
        const { provider, baseUrl, model, systemPrompt, maxChars, apiKey, keySaved, testStatus, scrollToLatest, threadCount, } = this.state;
        const preset = (0, providers_1.providerById)(provider);
        return (mailspring_exports_1.React.createElement("div", { className: "container-inbox-assist" },
            mailspring_exports_1.React.createElement("section", null,
                mailspring_exports_1.React.createElement("h6", null, "Reading"),
                mailspring_exports_1.React.createElement("div", { className: "inbox-assist-checkbox" },
                    mailspring_exports_1.React.createElement("input", { id: "inbox-assist-thread-count", type: "checkbox", checked: threadCount, onChange: this._toggle("threadCount", config_keys_1.CONFIG_KEYS.THREAD_COUNT) }),
                    mailspring_exports_1.React.createElement("label", { htmlFor: "inbox-assist-thread-count" }, "Show a message-count badge on conversations in the thread list")),
                mailspring_exports_1.React.createElement("div", { className: "inbox-assist-checkbox" },
                    mailspring_exports_1.React.createElement("input", { id: "inbox-assist-scroll-to-latest", type: "checkbox", checked: scrollToLatest, onChange: this._toggle("scrollToLatest", config_keys_1.CONFIG_KEYS.SCROLL_TO_LATEST) }),
                    mailspring_exports_1.React.createElement("label", { htmlFor: "inbox-assist-scroll-to-latest" }, "Scroll to the latest message when opening a conversation")),
                mailspring_exports_1.React.createElement("p", { className: "inbox-assist-hint" }, "Off: conversations open at the top, with the oldest message (Mailspring's default).")),
            mailspring_exports_1.React.createElement("section", null,
                mailspring_exports_1.React.createElement("h6", null, "AI summary"),
                mailspring_exports_1.React.createElement("p", { className: "inbox-assist-hint" },
                    "Any OpenAI-compatible ",
                    mailspring_exports_1.React.createElement("code", null, "/chat/completions"),
                    " endpoint: a cloud API, a mainland-China provider, or a model running locally (Ollama, LM Studio). Email content is sent to the endpoint below."),
                mailspring_exports_1.React.createElement("label", null, "Provider"),
                mailspring_exports_1.React.createElement("select", { value: provider, onChange: this._onProviderChange }, providers_1.PROVIDERS.map((p) => mailspring_exports_1.React.createElement("option", { key: p.id, value: p.id }, p.label))),
                mailspring_exports_1.React.createElement("label", null, "Base URL"),
                mailspring_exports_1.React.createElement("input", { type: "text", value: baseUrl, placeholder: "https://host/v1", onChange: this._set("baseUrl", config_keys_1.CONFIG_KEYS.AI_BASE_URL) }),
                mailspring_exports_1.React.createElement("label", null, "Model"),
                mailspring_exports_1.React.createElement("input", { type: "text", value: model, onChange: this._set("model", config_keys_1.CONFIG_KEYS.AI_MODEL) }),
                mailspring_exports_1.React.createElement("label", null,
                    "API key ",
                    preset && !preset.needsKey ? "(usually not needed)" : ""),
                mailspring_exports_1.React.createElement("div", { className: "inbox-assist-row" },
                    mailspring_exports_1.React.createElement("input", { type: "password", value: apiKey, placeholder: "stored in the system keychain", onChange: (e) => this.setState({ apiKey: e.target.value, keySaved: false }), onBlur: this._saveKey }),
                    mailspring_exports_1.React.createElement("button", { className: "btn", onClick: this._saveKey }, keySaved ? "Saved" : "Save key")),
                mailspring_exports_1.React.createElement("div", { className: "inbox-assist-row" },
                    mailspring_exports_1.React.createElement("button", { className: "btn", onClick: this._test }, "Test connection"),
                    mailspring_exports_1.React.createElement("span", { className: "inbox-assist-hint" }, testStatus)),
                mailspring_exports_1.React.createElement("label", null, "Instructions (system prompt)"),
                mailspring_exports_1.React.createElement("textarea", { rows: 5, value: systemPrompt, onChange: this._set("systemPrompt", config_keys_1.CONFIG_KEYS.AI_SYSTEM_PROMPT) }),
                mailspring_exports_1.React.createElement("div", null,
                    mailspring_exports_1.React.createElement("a", { onClick: this._resetPrompt }, "Reset to default")),
                mailspring_exports_1.React.createElement("label", null, "Max characters sent per thread"),
                mailspring_exports_1.React.createElement("input", { type: "number", min: 1000, step: 1000, value: maxChars, placeholder: String(providers_1.DEFAULT_MAX_CHARS), onChange: this._set("maxChars", config_keys_1.CONFIG_KEYS.AI_MAX_CHARS) }))));
    }
}
InboxAssistPreferences.displayName = "InboxAssistPreferences";
exports["default"] = InboxAssistPreferences;


/***/ },

/***/ "./src/scroll-to-latest.tsx"
/*!**********************************!*\
  !*** ./src/scroll-to-latest.tsx ***!
  \**********************************/
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
const config_keys_1 = __webpack_require__(/*! ./config-keys */ "./src/config-keys.ts");
// How long to keep the latest message pinned while bodies above it finish loading.
// Message bodies render in iframes that grow after load, which pushes the target down.
const PIN_MS = 3000;
const TOP_GAP = 8;
// Invisible component injected into the message list's scroll region (role
// "MessageListHeaders"). When a thread opens, it scrolls the reading pane to the
// latest message instead of leaving it at the oldest one at the top.
class ScrollToLatest extends mailspring_exports_1.React.Component {
    constructor() {
        super(...arguments);
        this._marker = null;
        this._scrolledThreadId = null;
        this._stopPinning = null;
    }
    componentDidMount() {
        this._maybeScroll();
    }
    componentDidUpdate() {
        this._maybeScroll();
    }
    componentWillUnmount() {
        var _a;
        (_a = this._stopPinning) === null || _a === void 0 ? void 0 : _a.call(this);
    }
    _maybeScroll() {
        var _a;
        const { thread, messages = [] } = this.props;
        if (!thread || thread.id === this._scrolledThreadId) {
            return;
        }
        // messages for the new thread load after the thread itself; wait for them
        if (messages.length === 0 || messages[0].threadId !== thread.id) {
            return;
        }
        this._scrolledThreadId = thread.id;
        (_a = this._stopPinning) === null || _a === void 0 ? void 0 : _a.call(this);
        if (!(0, config_keys_1.scrollToLatestEnabled)() || messages.length < 2) {
            return;
        }
        // let the message list render the new thread's messages first
        window.requestAnimationFrame(() => this._pinToLatest(thread.id));
    }
    _pinToLatest(threadId) {
        var _a;
        const viewport = (((_a = this._marker) === null || _a === void 0 ? void 0 : _a.closest(".scroll-region-content"))
            || document.querySelector(".messages-wrap .scroll-region-content"));
        if (!viewport || this._scrolledThreadId !== threadId) {
            return;
        }
        // the custom scrollbar sits beside the viewport, inside the region root
        const region = (viewport.closest(".scroll-region") || viewport);
        const scroll = () => {
            const items = viewport.querySelectorAll(".message-item-wrap:not(.draft)");
            const latest = items[items.length - 1];
            if (!latest) {
                return;
            }
            const offset = latest.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
            viewport.scrollTop += offset - TOP_GAP;
        };
        scroll();
        // keep re-aligning as iframes above grow, until the user takes over or time runs out
        const content = viewport.firstElementChild || viewport;
        const observer = new ResizeObserver(scroll);
        observer.observe(content);
        const userEvents = ["wheel", "mousedown", "keydown", "touchstart"];
        const stop = () => {
            observer.disconnect();
            clearTimeout(timer);
            userEvents.forEach((e) => region.removeEventListener(e, stop, true));
            if (this._stopPinning === stop) {
                this._stopPinning = null;
            }
        };
        const timer = setTimeout(stop, PIN_MS);
        userEvents.forEach((e) => region.addEventListener(e, stop, true));
        this._stopPinning = stop;
    }
    render() {
        // a zero-size marker, only used to find the surrounding scroll region
        return (mailspring_exports_1.React.createElement("span", { className: "inbox-assist-scroll-marker", style: { display: "none" }, ref: (el) => (this._marker = el) }));
    }
}
ScrollToLatest.displayName = "InboxAssistScrollToLatest";
ScrollToLatest.containerRequired = false;
exports["default"] = ScrollToLatest;


/***/ },

/***/ "./src/thread-count-badge.tsx"
/*!************************************!*\
  !*** ./src/thread-count-badge.tsx ***!
  \************************************/
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ThreadCountBadgeFeature = void 0;
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
const config_keys_1 = __webpack_require__(/*! ./config-keys */ "./src/config-keys.ts");
const PATCHED = "__inboxAssistCountPatched";
const MODULE_NAME = /[\\/]thread-list-participants\.(js|ts)$/;
// Shows a message-count badge next to the participants of every multi-message
// conversation in the thread list, in both the wide and narrow layouts.
//
// Mailspring already appends " (N)" to the participants text, but it's the first thing
// cut off by the ellipsis. There's no plugin slot beside the participants, so this
// wraps the ThreadListParticipants component in its already-loaded module (found in
// Node's require cache, like the right-click menu hook). The thread-list columns read
// that export at render time, so the wrapper takes effect on the next render.
class ThreadCountBadgeFeature {
    constructor() {
        this._exports = null;
        this._original = null;
    }
    enable() {
        const exported = findModuleExports();
        const original = exported === null || exported === void 0 ? void 0 : exported.default;
        if (!original) {
            console.warn("[mailspring-inbox-assist] thread list participants not found; message-count badge disabled");
            return;
        }
        if (original[PATCHED]) {
            return;
        }
        const Wrapped = mailspring_exports_1.React.memo((props) => withCountBadge(original, props), (prev, next) => prev.thread === next.thread);
        Wrapped.displayName = original.displayName || "ThreadListParticipants";
        Wrapped[PATCHED] = true;
        try {
            exported.default = Wrapped;
        }
        catch (e) {
            console.warn("[mailspring-inbox-assist] couldn't wrap thread list participants", e);
            return;
        }
        this._exports = exported;
        this._original = original;
    }
    disable() {
        if (this._exports && this._original) {
            this._exports.default = this._original;
        }
        this._exports = null;
        this._original = null;
    }
}
exports.ThreadCountBadgeFeature = ThreadCountBadgeFeature;
function withCountBadge(Original, props) {
    const participants = mailspring_exports_1.React.createElement(Original, Object.assign({}, props));
    const { thread } = props;
    if (!(0, config_keys_1.threadCountEnabled)() || !thread) {
        return participants;
    }
    const count = (thread.__messages || []).filter((m) => !m.draft).length;
    if (count < 2) {
        return participants;
    }
    return (mailspring_exports_1.React.createElement("div", { className: "inbox-assist-participants" },
        participants,
        mailspring_exports_1.React.createElement("span", { className: `inbox-assist-thread-count ${thread.unread ? "unread" : ""}`, title: `${count} messages in this conversation` }, count)));
}
function findModuleExports() {
    const cache = require.cache || {};
    const key = Object.keys(cache).find((k) => MODULE_NAME.test(k));
    return key ? cache[key].exports : null;
}


/***/ },

/***/ "./src/thread-filters-feature.ts"
/*!***************************************!*\
  !*** ./src/thread-filters-feature.ts ***!
  \***************************************/
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ThreadFiltersFeature = void 0;
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
const config_keys_1 = __webpack_require__(/*! ./config-keys */ "./src/config-keys.ts");
const PATCHED = "__inboxAssistThreadsPatched";
// Hooks FocusedPerspectiveStore.current() so every perspective handed to the thread list
// gets its threads() wrapped. The wrapper reads the filter setting on each call:
//  - search perspectives get is:unread / is:starred appended to their query string
//  - folder / label / starred perspectives get an extra matcher on their thread query
class ThreadFiltersFeature {
    constructor() {
        this._active = false;
        this._originalCurrent = null;
        this._hadOwnCurrent = false;
    }
    enable() {
        if (this._active) {
            return;
        }
        this._active = true;
        const store = mailspring_exports_1.FocusedPerspectiveStore;
        const feature = this;
        const original = store.current;
        this._hadOwnCurrent = Object.prototype.hasOwnProperty.call(store, "current");
        this._originalCurrent = original;
        store.current = function currentWithInboxAssist(...args) {
            const perspective = original.apply(this, args);
            feature.patchPerspective(perspective);
            return perspective;
        };
        console.log("[mailspring-inbox-assist] thread filters enabled");
    }
    disable() {
        if (!this._active) {
            return;
        }
        this._active = false;
        const store = mailspring_exports_1.FocusedPerspectiveStore;
        if (this._hadOwnCurrent) {
            store.current = this._originalCurrent;
        }
        else {
            delete store.current;
        }
        this._originalCurrent = null;
        console.log("[mailspring-inbox-assist] thread filters disabled");
    }
    patchPerspective(perspective) {
        if (!perspective || perspective[PATCHED] || typeof perspective.threads !== "function") {
            return;
        }
        const feature = this;
        const originalThreads = perspective.threads;
        // instance-level override: leaves the perspective classes untouched
        perspective.threads = function threadsWithInboxAssist(...args) {
            // already-patched instances outlive disable(), so check on every call
            if (!feature._active) {
                return originalThreads.apply(this, args);
            }
            if (isSearchPerspective(this)) {
                const shadow = Object.create(this);
                shadow.searchQuery = buildSearchQuery(this);
                return originalThreads.apply(shadow, args);
            }
            return applyFilter(originalThreads.apply(this, args));
        };
        perspective[PATCHED] = true;
    }
}
exports.ThreadFiltersFeature = ThreadFiltersFeature;
function isSearchPerspective(perspective) {
    return typeof perspective.searchQuery === "string" && !!perspective.sourcePerspective;
}
function buildSearchQuery(perspective) {
    const filter = (0, config_keys_1.threadFilter)();
    return filter === "all"
        ? perspective.searchQuery
        : `(${perspective.searchQuery}) AND is:${filter}`;
}
function applyFilter(subscription) {
    const filter = (0, config_keys_1.threadFilter)();
    if (filter === "all" || !subscription || typeof subscription.replaceQuery !== "function") {
        return subscription;
    }
    // only thread lists (skips drafts and other non-thread perspectives)
    const query = subscription.query();
    if (!query || query._klass !== mailspring_exports_1.Thread) {
        return subscription;
    }
    const matcher = filter === "unread"
        ? mailspring_exports_1.Thread.attributes.unread.equal(true)
        : mailspring_exports_1.Thread.attributes.starred.equal(true);
    // clone() returns an un-finalized copy, so it can still take more matchers
    subscription.replaceQuery(query.clone().where([matcher]));
    return subscription;
}


/***/ },

/***/ "./src/thread-list-refresh.ts"
/*!************************************!*\
  !*** ./src/thread-list-refresh.ts ***!
  \************************************/
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.refreshThreadList = refreshThreadList;
const mailspring_exports_1 = __webpack_require__(/*! mailspring-exports */ "mailspring-exports");
let _scheduled = false;
// The thread list rebuilds its query whenever FocusedPerspectiveStore triggers, and that
// rebuild calls perspective.threads() again, which is where the Inbox Assist filter applies.
// Emitting a change on the store is enough to re-run it without switching perspectives.
// Calls made in the same tick are coalesced into one refresh.
function refreshThreadList() {
    if (_scheduled) {
        return;
    }
    _scheduled = true;
    setTimeout(() => {
        _scheduled = false;
        mailspring_exports_1.FocusedPerspectiveStore.trigger();
    }, 0);
}


/***/ },

/***/ "@electron/remote"
/*!***********************************!*\
  !*** external "@electron/remote" ***!
  \***********************************/
(module) {

module.exports = require("@electron/remote");

/***/ },

/***/ "mailspring-component-kit"
/*!*******************************************!*\
  !*** external "mailspring-component-kit" ***!
  \*******************************************/
(module) {

module.exports = require("mailspring-component-kit");

/***/ },

/***/ "mailspring-exports"
/*!*************************************!*\
  !*** external "mailspring-exports" ***!
  \*************************************/
(module) {

module.exports = require("mailspring-exports");

/***/ },

/***/ "electron"
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
(module) {

module.exports = require("electron");

/***/ },

/***/ "http"
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
(module) {

module.exports = require("http");

/***/ },

/***/ "https"
/*!************************!*\
  !*** external "https" ***!
  \************************/
(module) {

module.exports = require("https");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			const e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	let __webpack_exports__ = __webpack_require__("./src/main.ts");
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=main.js.map