import * as http from "http";
import * as https from "https";

export interface LlmSettings {
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

const TIMEOUT_MS = 120000;

// Calls an OpenAI-compatible /chat/completions endpoint.
// Uses Node's http(s) instead of fetch so local servers and APIs without CORS headers work.
export function chatCompletion(settings: LlmSettings, messages: ChatMessage[]): Promise<string> {
    if (!settings.baseUrl) {
        return Promise.reject(new Error("No base URL configured (Preferences → Inbox Assist)."));
    }
    if (!settings.model) {
        return Promise.reject(new Error("No model configured (Preferences → Inbox Assist)."));
    }

    let url: URL;
    try {
        url = new URL(`${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`);
    } catch (e) {
        return Promise.reject(new Error(`Invalid base URL: ${settings.baseUrl}`));
    }

    const body = JSON.stringify({
        model: settings.model,
        messages,
        temperature: 0.2,
        stream: false,
    });

    const headers: Record<string, string | number> = {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
    };
    if (settings.apiKey) {
        headers.Authorization = `Bearer ${settings.apiKey}`;
    }

    const transport = url.protocol === "http:" ? http : https;

    return new Promise((resolve, reject) => {
        const req = transport.request(url, {method: "POST", headers, timeout: TIMEOUT_MS}, (res) => {
            let data = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`HTTP ${res.statusCode}: ${errorMessage(data)}`));
                    return;
                }
                try {
                    const content = JSON.parse(data)?.choices?.[0]?.message?.content;
                    if (typeof content !== "string" || !content.trim()) {
                        reject(new Error("The model returned an empty response."));
                        return;
                    }
                    resolve(stripReasoning(content));
                } catch (e) {
                    reject(new Error(`Unexpected response: ${data.slice(0, 200)}`));
                }
            });
        });

        req.on("timeout", () => req.destroy(new Error(`Request timed out after ${TIMEOUT_MS / 1000}s`)));
        req.on("error", (err: any) => {
            reject(err.code === "ECONNREFUSED"
                ? new Error(`Cannot connect to ${url.host}. Is the server running?`)
                : err);
        });

        req.write(body);
        req.end();
    });
}

function errorMessage(data: string) {
    try {
        const json = JSON.parse(data);
        return json?.error?.message || json?.message || data.slice(0, 200);
    } catch (e) {
        return data.slice(0, 200) || "no response body";
    }
}

// reasoning models (DeepSeek-R1, Qwen3, ...) may inline their chain of thought
function stripReasoning(text: string) {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}
