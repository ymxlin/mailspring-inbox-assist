const PREFIX = "mailspring-inbox-assist";

export const CONFIG_KEYS = {
    // "all" | "unread" | "starred"
    THREAD_FILTER: `${PREFIX}.threadFilter`,
    // open threads scrolled to the latest message (on unless turned off)
    SCROLL_TO_LATEST: `${PREFIX}.scrollToLatest`,

    AI_PROVIDER: `${PREFIX}.ai.provider`,
    AI_BASE_URL: `${PREFIX}.ai.baseUrl`,
    AI_MODEL: `${PREFIX}.ai.model`,
    AI_SYSTEM_PROMPT: `${PREFIX}.ai.systemPrompt`,
    AI_MAX_CHARS: `${PREFIX}.ai.maxChars`,
};

// keys that change which threads are listed, so the thread list must refresh
export const LIST_KEYS = [CONFIG_KEYS.THREAD_FILTER];

// stored in the OS keychain via KeyManager, never in config.json
export const API_KEY_SECRET_NAME = `${PREFIX}.ai.apiKey`;

export type ThreadFilter = "all" | "unread" | "starred";

// defaults to on: only an explicit `false` turns it off
export function scrollToLatestEnabled(): boolean {
    return AppEnv.config.get(CONFIG_KEYS.SCROLL_TO_LATEST) !== false;
}

export function threadFilter(): ThreadFilter {
    const value = AppEnv.config.get(CONFIG_KEYS.THREAD_FILTER);
    return value === "unread" || value === "starred" ? value : "all";
}
