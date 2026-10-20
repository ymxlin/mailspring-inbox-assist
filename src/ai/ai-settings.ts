import {KeyManager} from "mailspring-exports";
import {API_KEY_SECRET_NAME, CONFIG_KEYS} from "../config-keys";
import {DEFAULT_MAX_CHARS, DEFAULT_PROVIDER, DEFAULT_SYSTEM_PROMPT} from "./providers";
import {LlmSettings} from "./llm-client";

export function aiConfig() {
    const get = (key: string, fallback: any) => {
        const value = AppEnv.config.get(key);
        return value === undefined || value === null || value === "" ? fallback : value;
    };

    return {
        provider: get(CONFIG_KEYS.AI_PROVIDER, DEFAULT_PROVIDER.id) as string,
        baseUrl: get(CONFIG_KEYS.AI_BASE_URL, DEFAULT_PROVIDER.baseUrl) as string,
        model: get(CONFIG_KEYS.AI_MODEL, DEFAULT_PROVIDER.model) as string,
        systemPrompt: get(CONFIG_KEYS.AI_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT) as string,
        maxChars: Number(get(CONFIG_KEYS.AI_MAX_CHARS, DEFAULT_MAX_CHARS)) || DEFAULT_MAX_CHARS,
    };
}

export async function getApiKey(): Promise<string> {
    try {
        return (await KeyManager.getPassword(API_KEY_SECRET_NAME)) || "";
    } catch (e) {
        return "";
    }
}

export async function setApiKey(value: string) {
    if (value) {
        await KeyManager.replacePassword(API_KEY_SECRET_NAME, value);
    } else {
        await KeyManager.deletePassword(API_KEY_SECRET_NAME);
    }
}

export async function llmSettings(): Promise<LlmSettings> {
    const config = aiConfig();
    return {baseUrl: config.baseUrl, model: config.model, apiKey: await getApiKey()};
}
