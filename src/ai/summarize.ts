import {DatabaseStore, Message, MessageStore, QuotedHTMLTransformer, Thread} from "mailspring-exports";
import {aiConfig, llmSettings} from "./ai-settings";
import {chatCompletion} from "./llm-client";

export interface SummaryResult {
    summary: string;
    model: string;
    truncated: boolean;
}

// Summarizes a thread by id, or the thread open in the message list when no id is given.
// Messages are loaded from the database (with bodies) so this works for threads that
// aren't open, e.g. from the thread list's right-click menu.
export async function summarizeThread(threadId: string = MessageStore.threadId()): Promise<SummaryResult> {
    if (!threadId) {
        throw new Error("No email is open.");
    }

    const thread = await DatabaseStore.find(Thread, threadId);
    const messages: any[] = (await DatabaseStore.findAll(Message, {threadId})
        .include(Message.attributes.body)
        .order(Message.attributes.date.ascending()))
        .filter((m: any) => !m.draft);

    if (!thread || messages.length === 0) {
        throw new Error("Couldn't load this email.");
    }

    const config = aiConfig();
    const {text, truncated} = threadToText(thread, messages, config.maxChars);
    const settings = await llmSettings();

    const summary = await chatCompletion(settings, [
        {role: "system", content: config.systemPrompt},
        {role: "user", content: text},
    ]);

    return {summary, model: settings.model, truncated};
}

function threadToText(thread: any, messages: any[], maxChars: number) {
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

    let text = `Subject: ${thread.subject || "(no subject)"}\n\n${parts.join("\n\n")}`;
    let truncated = false;

    // keep the end of the thread: the latest messages matter most
    if (text.length > maxChars) {
        text = `[earlier part of the thread omitted]\n…${text.slice(text.length - maxChars)}`;
        truncated = true;
    }

    return {text, truncated};
}

function formatContact(contact: any) {
    if (!contact) {
        return "";
    }
    return contact.name && contact.name !== contact.email
        ? `${contact.name} <${contact.email}>`
        : contact.email;
}

function messageBodyText(message: any): string {
    const body: string = message.body;
    if (!body) {
        return message.snippet || "";
    }
    if (message.plaintext) {
        return body.trim();
    }

    let html = body;
    try {
        html = QuotedHTMLTransformer.removeQuotedHTML(body, {keepIfWholeBodyIsQuote: true});
    } catch (e) {
        // fall back to the full body
    }
    return htmlToText(html);
}

function htmlToText(html: string) {
    const doc = new DOMParser().parseFromString(html, "text/html");

    doc.querySelectorAll("script, style, head, title").forEach((el) => el.remove());
    doc.querySelectorAll("br").forEach((el) => el.replaceWith("\n"));
    doc.querySelectorAll("p, div, li, tr, h1, h2, h3, h4, h5, h6, blockquote, table")
        .forEach((el) => el.append("\n"));

    return (doc.body?.textContent || "")
        .replace(/[ \t ]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
